/**
 * Content Moderation (PPT slide 9): member reports, automatic chat-filter
 * flags, the admin queue, decisions on each report and the moderation history.
 *
 *   createReport   a member reports a chat message, an advisor post or a user
 *   createAutoFlag the chat filter blocked one of the caller's own messages
 *   listReports    the admin queue (filters, search, pagination, counters)
 *   getReport      one report with the author's prior warnings/sanctions
 *   decide         approve | reject | escalate | remove_content | warn | suspend | ban
 *   bulkDecide     approve | reject | escalate | remove_content on many reports
 *   listHistory    every decision ever taken (moderation_actions)
 *
 * Warnings, suspensions and blocks go through UserSanctionService, which owns
 * the account rules (no self, no super admin, staff only by a super admin),
 * the user_sanctions history, the in-app notification and session revocation.
 * Every decision here also leaves a moderation_actions row and an audit_logs row.
 */
const { Op } = require('sequelize');
const db = require('../models');
const Sanctions = require('./UserSanctionService');
const { canReadRoom } = require('../utils/roomAccess');
const { effectiveRole } = require('../utils/roles');
const { MODERATION_REMOVED_STATUS, viewerAccess, canRead } = require('../utils/advisorPostAccess');
const crypto = require('crypto');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Report reasons and the severity a report starts with. */
const REASONS = {
  scam: 'critical',
  harassment: 'high',
  hate: 'high',
  personal_info: 'high',
  inappropriate: 'medium',
  misinformation: 'medium',
  spam: 'low',
  other: 'low',
};
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['pending', 'escalated', 'resolved', 'dismissed'];
const OPEN = ['pending', 'escalated'];
const REPORTABLE = ['message', 'advisor_post', 'user'];
const TARGET_TYPES = [...REPORTABLE, 'blocked_message'];
const SOURCES = ['user', 'auto'];

/** action -> what the report becomes. */
const ACTIONS = {
  approve: { status: 'dismissed', decision: 'approved', needsReason: false },
  reject: { status: 'dismissed', decision: 'rejected', needsReason: false },
  escalate: { status: 'escalated', decision: 'escalated', needsReason: false },
  remove_content: { status: 'resolved', decision: 'removed', needsReason: true },
  warn: { status: 'resolved', decision: 'warned', needsReason: true, sanction: 'warn' },
  suspend: { status: 'resolved', decision: 'suspended', needsReason: true, sanction: 'suspend' },
  ban: { status: 'resolved', decision: 'banned', needsReason: true, sanction: 'ban' },
};
const BULK_ACTIONS = ['approve', 'reject', 'escalate', 'remove_content'];
const MAX_BULK = 100;
const MAX_NOTE = 1000;
const MAX_SNAPSHOT = 2000;
const STAFF = new Set(['admin', 'sub_admin', 'super_admin']);

class ModerationError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MIGRATION_PENDING = () => new ModerationError(503, 'Content moderation needs a pending database update (migration 019).', 'MIGRATION_PENDING');
const isMissingTable = (e) => /doesn't exist|no such table|ER_NO_SUCH_TABLE|Unknown column/i.test(String(e && e.message));

/** Runs a query, turning "table not migrated yet" into a 503. */
async function guarded(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ModerationError || e instanceof Sanctions.SanctionError) throw e;
    if (isMissingTable(e)) throw MIGRATION_PENDING();
    throw e;
  }
}

const plain = (row) => (row && typeof row.toJSON === 'function' ? row.toJSON() : row);
const cleanText = (value, max) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new ModerationError(400, 'Invalid text');
  return value.trim().slice(0, max);
};
const truncate = (value, max) => (value == null ? null : String(value).slice(0, max));
const userName = (u) => (u ? u.display_name || u.name || u.email || 'Unknown user' : null);

// ---------------------------------------------------------------------------
// Schema check (the schemaGuard pattern): one describeTable per table, cached.
// ---------------------------------------------------------------------------
const RETRY_MS = 30000;
let schemaState = null; // { ready: boolean, checked: boolean, at }

async function schemaReady() {
  if (schemaState && (schemaState.checked || Date.now() - schemaState.at < RETRY_MS)) return schemaState.ready;
  try {
    const qi = db.sequelize.getQueryInterface();
    await qi.describeTable('content_reports');
    await qi.describeTable('moderation_actions');
    schemaState = { ready: true, checked: true };
  } catch (e) {
    if (isMissingTable(e)) {
      console.warn('[ModerationService] content_reports / moderation_actions missing; apply migration 019 and restart the API');
      schemaState = { ready: false, checked: true };
    } else {
      // Unknown (e.g. database unreachable): let the request try, and fail on its own.
      schemaState = { ready: true, checked: false, at: Date.now() };
    }
  }
  return schemaState.ready;
}

/** Express middleware: 503 MIGRATION_PENDING until migration 019 is applied. */
async function requireSchema(_req, res, next) {
  if (await schemaReady()) return next();
  return res.status(503).json({ error: 'Content moderation needs a pending database update. Please try again later.', code: 'MIGRATION_PENDING' });
}

// ---------------------------------------------------------------------------
// Member reports
// ---------------------------------------------------------------------------

/** Loads what is being reported and who wrote it. Throws 404 for anything the reporter may not see. */
async function resolveTarget(reporter, targetType, targetId) {
  if (targetType === 'message') {
    const msg = await db.Message.findByPk(targetId);
    if (!msg || msg.is_deleted || !(await canReadRoom(reporter, msg.chat_room_id))) {
      throw new ModerationError(404, 'Message not found');
    }
    return {
      targetUserId: msg.user_id || null,
      snapshot: msg.content || (msg.message_type === 'file' ? '[file attachment]' : ''),
      context: { chat_room_id: msg.chat_room_id || null, message_type: msg.message_type || null },
    };
  }
  if (targetType === 'advisor_post') {
    const post = await db.AdvisorPost.findByPk(targetId);
    if (!post || post.status !== 'published') throw new ModerationError(404, 'Post not found');
    const advisor = post.advisor_id ? await db.Advisor.findByPk(post.advisor_id) : null;
    // Same rule as the advisor feed: only a post the reporter can read in full
    // (public, or one their subscription unlocks) may be reported, so the
    // snapshot never holds text the reporter was not shown.
    if (!advisor || advisor.status !== 'approved') throw new ModerationError(404, 'Post not found');
    const plans = await db.SubscriptionPlan.findAll({ where: { advisor_id: advisor.id }, attributes: ['id', 'price'] });
    if (!canRead(post, await viewerAccess(reporter, advisor, plans), plans)) throw new ModerationError(404, 'Post not found');
    const title = post.title ? `${post.title}\n\n` : '';
    return {
      targetUserId: advisor ? advisor.user_id : null,
      snapshot: `${title}${post.content || ''}`,
      context: { advisor_id: post.advisor_id || null, title: truncate(post.title, 200) },
    };
  }
  // user. An unknown id is not an error the caller can see (see createReport).
  const user = await db.User.findByPk(targetId, { attributes: { exclude: ['password'] } });
  if (!user) return { unknownUser: true };
  return { targetUserId: user.id, snapshot: null, context: { display_name: truncate(userName(user), 150) } };
}

/**
 * A member's report. Repeats from the same reporter on the same target are
 * collapsed onto the first report ({ duplicate: true }). Returns only what the
 * reporter may see: never the snapshot, the author, or other reporters.
 */
async function createReport(reporter, body = {}) {
  if (!reporter || !reporter.id) throw new ModerationError(401, 'Authentication required');
  const targetType = body.target_type;
  const targetId = body.target_id;
  const reason = body.reason;
  if (!REPORTABLE.includes(targetType)) throw new ModerationError(400, 'Choose what you are reporting.');
  if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) throw new ModerationError(400, 'Invalid report target.');
  if (!Object.prototype.hasOwnProperty.call(REASONS, reason)) throw new ModerationError(400, 'Choose a reason for the report.');
  const note = cleanText(body.note, MAX_NOTE);
  if (reason === 'other' && !note) throw new ModerationError(400, 'Tell us briefly what is wrong.');

  return guarded(async () => {
    const target = await resolveTarget(reporter, targetType, targetId);
    // A user report on an id that does not exist answers exactly like a new
    // report, so the endpoint cannot be used to probe which user ids exist.
    // Nothing is stored.
    if (target.unknownUser) return phantomReport(reporter.id, targetType, targetId);
    if (target.targetUserId && String(target.targetUserId) === String(reporter.id)) {
      throw new ModerationError(400, 'You cannot report your own content.', 'SELF');
    }

    const where = { reporter_id: reporter.id, target_type: targetType, target_id: targetId };
    const existing = await db.ContentReport.findOne({ where });
    const shape = (r, duplicate) => ({ id: r.id, status: r.status, created_at: r.created_at, duplicate });
    if (existing) return shape(existing, true);

    try {
      const report = await db.ContentReport.create({
        target_type: targetType,
        target_id: targetId,
        target_user_id: target.targetUserId,
        reporter_id: reporter.id,
        source: 'user',
        reason,
        note: note || null,
        content_snapshot: truncate(target.snapshot, MAX_SNAPSHOT),
        context: target.context,
        severity: REASONS[reason],
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
      return shape(report, false);
    } catch (e) {
      // Two reports racing past findOne: the unique key keeps one.
      if (e && e.name === 'SequelizeUniqueConstraintError') {
        const row = await db.ContentReport.findOne({ where });
        if (row) return shape(row, true);
      }
      throw e;
    }
  });
}

// Reports on user ids that do not exist are answered like real ones, and a
// repeat is answered like a real duplicate (same id, duplicate: true), so two
// reports cannot reveal whether an id exists. Remembered in memory, bounded.
const PHANTOM_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PHANTOM_MAX = 10000;
const phantoms = new Map();

function phantomReport(reporterId, targetType, targetId) {
  const key = `${reporterId}:${targetType}:${targetId}`;
  const now = Date.now();
  const seen = phantoms.get(key);
  if (seen && now - seen.at < PHANTOM_TTL_MS) {
    return { id: seen.id, status: 'pending', created_at: seen.created_at, duplicate: true };
  }
  if (phantoms.size >= PHANTOM_MAX) phantoms.delete(phantoms.keys().next().value);
  const entry = { id: crypto.randomUUID(), created_at: new Date(now), at: now };
  phantoms.set(key, entry);
  return { id: entry.id, status: 'pending', created_at: entry.created_at, duplicate: false };
}

/** Only these come from the client-side MessageModerator. */
const AUTO_REASONS = ['scam', 'personal_info', 'harassment', 'inappropriate', 'spam'];

/**
 * The chat filter refused to send one of the caller's messages. Always about
 * the caller themselves (target_user_id is the caller, never a body value),
 * so the endpoint cannot be used to accuse anyone else.
 */
async function createAutoFlag(user, body = {}) {
  if (!user || !user.id) throw new ModerationError(401, 'Authentication required');
  const reason = AUTO_REASONS.includes(body.violation_type) ? body.violation_type : null;
  if (!reason) throw new ModerationError(400, 'Invalid violation type');
  const content = cleanText(body.content, MAX_SNAPSHOT);
  if (!content) throw new ModerationError(400, 'Content is required');
  const severity = SEVERITIES.includes(body.severity) ? body.severity : REASONS[reason];

  return guarded(async () => {
    let roomId = null;
    if (typeof body.chat_room_id === 'string' && UUID_RE.test(body.chat_room_id) && (await canReadRoom(user, body.chat_room_id))) {
      roomId = body.chat_room_id;
    }
    const row = await db.ContentReport.create({
      target_type: 'blocked_message',
      target_id: null,
      target_user_id: user.id,
      reporter_id: null,
      source: 'auto',
      reason,
      note: null,
      content_snapshot: content,
      context: { chat_room_id: roomId },
      severity,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: row.id };
  });
}

/** The reporter's own reports, without anything about the reported person. */
async function listMine(reporter, { limit = 50 } = {}) {
  return guarded(async () => {
    const rows = await db.ContentReport.findAll({
      where: { reporter_id: reporter.id },
      attributes: ['id', 'target_type', 'target_id', 'reason', 'status', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
    });
    return rows.map(plain);
  });
}

// ---------------------------------------------------------------------------
// Admin queue
// ---------------------------------------------------------------------------
const USER_ATTRS = ['id', 'name', 'display_name', 'email', 'status', 'app_role', 'role'];

async function usersById(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const users = await db.User.findAll({ where: { id: unique }, attributes: USER_ATTRS });
  return new Map(users.map((u) => [String(u.id), plain(u)]));
}

async function roomsById(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const rooms = await db.ChatRoom.findAll({ where: { id: unique }, attributes: ['id', 'name'] });
  return new Map(rooms.map((r) => [String(r.id), plain(r)]));
}

const publicUser = (u) => (u ? {
  id: u.id,
  name: userName(u),
  email: u.email || null,
  status: u.status || null,
  role: effectiveRole(u),
} : null);

/** Groups `count` results (array of { key, count }) into an object. */
function tally(rows, key, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows || []) {
    const k = r[key];
    if (k in out) out[k] += Number(r.count) || 0;
  }
  return out;
}

async function counters() {
  const [byStatus, bySeverity] = await Promise.all([
    db.ContentReport.count({ group: ['status'] }),
    db.ContentReport.count({ group: ['severity'] }),
  ]);
  const status = tally(byStatus, 'status', STATUSES);
  const severity = tally(bySeverity, 'severity', SEVERITIES);
  const total = Object.values(status).reduce((a, b) => a + b, 0);
  return { total, ...status, ...severity };
}

function parsePage(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function decorate(rows) {
  const items = rows.map(plain);
  const users = await usersById(items.flatMap((r) => [r.target_user_id, r.reporter_id, r.decided_by]));
  const rooms = await roomsById(items.map((r) => r.context && r.context.chat_room_id));
  return items.map((r) => ({
    ...r,
    target_user: publicUser(users.get(String(r.target_user_id))),
    reporter: r.reporter_id ? publicUser(users.get(String(r.reporter_id))) : null,
    decided_by_user: r.decided_by ? publicUser(users.get(String(r.decided_by))) : null,
    room: r.context && r.context.chat_room_id ? rooms.get(String(r.context.chat_room_id)) || null : null,
  }));
}

/** The queue. `status` may also be 'open' (pending + escalated) or 'all'. */
async function listReports(query = {}) {
  return guarded(async () => {
    const where = {};
    const status = typeof query.status === 'string' ? query.status : 'all';
    if (status === 'open') where.status = OPEN;
    else if (STATUSES.includes(status)) where.status = status;
    if (SEVERITIES.includes(query.severity)) where.severity = query.severity;
    if (Object.prototype.hasOwnProperty.call(REASONS, query.reason)) where.reason = query.reason;
    if (TARGET_TYPES.includes(query.target_type)) where.target_type = query.target_type;
    if (SOURCES.includes(query.source)) where.source = query.source;
    if (typeof query.target_user_id === 'string' && UUID_RE.test(query.target_user_id)) where.target_user_id = query.target_user_id;

    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
    if (q) {
      const like = { [Op.like]: `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` };
      const matchedUsers = await db.User.findAll({
        where: { [Op.or]: [{ name: like }, { display_name: like }, { email: like }] },
        attributes: ['id'],
        limit: 200,
      });
      const ids = matchedUsers.map((u) => u.id);
      where[Op.or] = [
        { content_snapshot: like },
        { note: like },
        { reason: like },
        ...(ids.length ? [{ target_user_id: ids }, { reporter_id: ids }] : []),
      ];
    }

    const { page, limit, offset } = parsePage(query);
    const [{ rows, count }, counts] = await Promise.all([
      db.ContentReport.findAndCountAll({ where, order: [['created_at', 'DESC']], limit, offset }),
      counters(),
    ]);
    return { items: await decorate(rows), total: count, page, limit, counts };
  });
}

/** Whether the reported thing is still there (for the review panel). */
async function liveTarget(report) {
  try {
    if (report.target_type === 'message' && report.target_id) {
      const msg = await db.Message.findByPk(report.target_id, { attributes: ['id', 'is_deleted', 'chat_room_id'] });
      return { exists: Boolean(msg), removed: !msg || Boolean(msg.is_deleted) };
    }
    if (report.target_type === 'advisor_post' && report.target_id) {
      const post = await db.AdvisorPost.findByPk(report.target_id, { attributes: ['id', 'status', 'advisor_id'] });
      return { exists: Boolean(post), removed: !post || post.status !== 'published' };
    }
  } catch (e) {
    console.error('[ModerationService] target lookup failed:', e.message);
  }
  return null;
}

/** One report, with everything the reviewer needs to judge "repeated violations". */
async function getReport(id) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new ModerationError(404, 'Report not found');
  return guarded(async () => {
    const row = await db.ContentReport.findByPk(id);
    if (!row) throw new ModerationError(404, 'Report not found');
    const [report] = await decorate([row]);

    const userId = report.target_user_id;
    let sanctions = [];
    let warnings = 0;
    if (userId) {
      try {
        [sanctions, warnings] = await Promise.all([Sanctions.history(userId, { limit: 20 }), Sanctions.warningCount(userId)]);
      } catch (e) {
        // user_sanctions not migrated yet: show the report without history.
        console.error('[ModerationService] sanction history unavailable:', e.message);
      }
    }
    const [otherReports, actions, target] = await Promise.all([
      userId
        ? db.ContentReport.findAll({
          where: { target_user_id: userId, id: { [Op.ne]: report.id } },
          attributes: ['id', 'target_type', 'reason', 'severity', 'status', 'decision', 'created_at'],
          order: [['created_at', 'DESC']],
          limit: 20,
        })
        : [],
      db.ModerationAction.findAll({ where: { report_id: report.id }, order: [['created_at', 'DESC']], limit: 50 }),
      liveTarget(report),
    ]);
    const moderators = await usersById(actions.map((a) => a.moderator_id));
    const sanctionActors = await usersById(sanctions.map((s) => s.actor_id));

    return {
      report,
      target,
      author: {
        warnings,
        sanctions: sanctions.map((s) => ({
          id: s.id, action: s.action, reason: s.reason, ends_at: s.ends_at, lifted_at: s.lifted_at,
          source: s.source, report_id: s.report_id, created_at: s.created_at,
          actor: publicUser(sanctionActors.get(String(s.actor_id))),
        })),
        reports: otherReports.map(plain),
      },
      actions: actions.map(plain).map((a) => ({ ...a, moderator: publicUser(moderators.get(String(a.moderator_id))) })),
    };
  });
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

/** Who may decide this report? Throws when the actor may not. */
function assertMayDecide(actor, report, author, affectsAuthor) {
  if (!actor || !actor.id) throw new ModerationError(401, 'Authentication required');
  if (report.target_user_id && String(report.target_user_id) === String(actor.id)) {
    throw new ModerationError(403, 'You cannot moderate a report about yourself.', 'SELF');
  }
  if (report.reporter_id && String(report.reporter_id) === String(actor.id) && effectiveRole(actor) !== 'super_admin') {
    throw new ModerationError(403, 'Another admin must review a report you filed.', 'OWN_REPORT');
  }
  // Removing staff content or sanctioning staff is a super admin's call, as in
  // UserSanctionService. Approve / reject / escalate stay open to any admin.
  const authorRole = effectiveRole(author);
  if (affectsAuthor && author && STAFF.has(authorRole) && effectiveRole(actor) !== 'super_admin') {
    throw new ModerationError(403, 'Only a super admin can moderate content posted by staff.', 'PROTECTED');
  }
}

/** Hides the reported content. Returns a short description of what was done. */
async function removeContent(report, { wsService } = {}) {
  if (report.target_type === 'message') {
    const msg = await db.Message.findByPk(report.target_id);
    if (!msg) return { removed: false, changed: false, reason: 'already_gone' };
    if (msg.is_deleted) return { removed: true, changed: false, kind: 'message' };
    // Soft delete and clear the text so it is no longer served to the room;
    // the report keeps the snapshot for the record.
    await db.Message.update({ is_deleted: true, content: '', media_urls: null }, { where: { id: msg.id } });
    try {
      if (wsService && wsService.broadcastToRoom) {
        wsService.broadcastToRoom(msg.chat_room_id, { type: 'message_deleted', messageId: msg.id, roomId: msg.chat_room_id, by: 'moderator' });
      }
    } catch (e) {
      console.error('[ModerationService] broadcast failed:', e.message);
    }
    return { removed: true, changed: true, kind: 'message' };
  }
  if (report.target_type === 'advisor_post') {
    const post = await db.AdvisorPost.findByPk(report.target_id);
    if (!post) return { removed: false, changed: false, reason: 'already_gone' };
    // Every public feed reads status = 'published' only, and the owner may not
    // edit or republish a post in this status (advisor.routes.js PUT /posts/:id).
    if (post.status === MODERATION_REMOVED_STATUS) return { removed: true, changed: false, kind: 'advisor_post' };
    await db.AdvisorPost.update({ status: MODERATION_REMOVED_STATUS }, { where: { id: post.id } });
    return { removed: true, changed: true, kind: 'advisor_post' };
  }
  if (report.target_type === 'blocked_message') {
    // The filter never let it through; nothing is stored to remove.
    return { removed: true, changed: false, kind: 'blocked_message' };
  }
  throw new ModerationError(400, 'There is no content to remove on a user report. Warn, suspend or block the user instead.', 'NOTHING_TO_REMOVE');
}

const esc = (value) => String(value == null ? '' : value)
  .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** In-app notice (and best-effort email) to the author that their content was removed. */
async function notifyRemoval(author, report, reason) {
  if (!author) return;
  const what = report.target_type === 'advisor_post' ? 'post' : 'message';
  try {
    await db.Notification.create({
      user_id: author.id,
      type: 'content_removed',
      title: `Your ${what} was removed by the moderation team`,
      message: `A ${what} you posted was removed for breaking the community guidelines. Reason: ${reason}.`,
      is_read: false,
      priority: 'high',
      data: { report_id: report.id, target_type: report.target_type },
    });
  } catch (e) {
    console.error('[ModerationService] removal notification failed:', e.message);
  }
  emailAuthor(author, `Your ${what} was removed`, `<p>Hello ${esc(userName(author))},</p><p>A ${what} you posted on Protocall was removed for breaking the community guidelines.</p><p><strong>Reason:</strong> ${esc(reason)}</p>`);
}

/** Fire-and-forget; EmailService already swallows its own errors. */
function emailAuthor(author, subject, html) {
  if (!author || !author.email) return;
  try {
    const EmailService = require('./EmailService');
    Promise.resolve(EmailService.sendEmail(author.email, subject, html)).catch(() => {});
  } catch (e) {
    console.error('[ModerationService] email failed:', e.message);
  }
}

async function recordAction(entry, ctx = {}) {
  try {
    await db.ModerationAction.create({ ...entry, ip_address: ctx.ip ? String(ctx.ip).slice(0, 45) : null, created_at: new Date() });
  } catch (e) {
    console.error('[ModerationService] history write failed:', e.message);
  }
  try {
    await db.AuditLog.create({
      user_id: entry.moderator_id,
      action: `moderation_${entry.action}`,
      entity_type: 'content_report',
      entity_id: entry.report_id || null,
      new_data: { outcome: entry.outcome, target_type: entry.target_type, target_id: entry.target_id, target_user_id: entry.target_user_id, details: entry.details || null },
      description: `${entry.action} on ${entry.target_type || 'report'}${entry.note ? `: ${entry.note}` : ''}`.slice(0, 1000),
      ip_address: ctx.ip ? String(ctx.ip).slice(0, 45) : null,
      user_agent: ctx.userAgent ? String(ctx.userAgent).slice(0, 255) : null,
    });
  } catch (e) {
    console.error('[ModerationService] audit write failed:', e.message);
  }
}

/** Closes the other open reports on content that was just removed. */
async function closeSiblings(report, actor, note) {
  if (!report.target_id) return 0;
  try {
    const [n] = await db.ContentReport.update(
      { status: 'resolved', decision: 'removed', decided_by: actor.id, decided_at: new Date(), decision_note: note, updated_at: new Date() },
      { where: { target_type: report.target_type, target_id: report.target_id, id: { [Op.ne]: report.id }, status: OPEN } }
    );
    return Number(n) || 0;
  } catch (e) {
    console.error('[ModerationService] closing related reports failed:', e.message);
    return 0;
  }
}

/**
 * Applies one decision to one report.
 *   opts.reason        required for remove_content / warn / suspend / ban
 *   opts.days          suspend: 1..365
 *   opts.also_remove   warn / suspend / ban: also remove the reported content
 *   opts.context       { ip, userAgent }
 *   opts.wsService     to close sockets and update the chat room live
 */
async function decide(reportId, action, actor, opts = {}) {
  const spec = ACTIONS[action];
  if (!spec) throw new ModerationError(400, 'Unknown moderation action');
  if (typeof reportId !== 'string' || !UUID_RE.test(reportId)) throw new ModerationError(404, 'Report not found');
  const reason = cleanText(opts.reason, MAX_NOTE);
  if (spec.needsReason && !reason) throw new ModerationError(400, 'A reason is required for this action.');
  const alsoRemove = Boolean(opts.also_remove) && Boolean(spec.sanction);
  const ctx = opts.context || {};
  if (action === 'suspend') {
    const days = Number(opts.days);
    if (!Number.isInteger(days) || days < 1 || days > Sanctions.MAX_SUSPENSION_DAYS) {
      throw new ModerationError(400, `Suspension length must be 1 to ${Sanctions.MAX_SUSPENSION_DAYS} days.`);
    }
  }

  return guarded(async () => {
    const report = await db.ContentReport.findByPk(reportId);
    if (!report) throw new ModerationError(404, 'Report not found');
    if (!OPEN.includes(report.status)) throw new ModerationError(409, 'This report has already been decided.', 'REPORT_CLOSED');
    if (action === 'escalate' && report.status === 'escalated') throw new ModerationError(409, 'This report is already escalated.', 'REPORT_CLOSED');
    if (spec.sanction && !report.target_user_id) throw new ModerationError(400, 'This report has no author to sanction.');

    const author = report.target_user_id
      ? await db.User.findByPk(report.target_user_id, { attributes: { exclude: ['password'] } })
      : null;
    assertMayDecide(actor, report, author, Boolean(spec.sanction) || action === 'remove_content');
    if (spec.sanction) Sanctions.assertMaySanction(actor, author || { id: report.target_user_id });

    // Claim the report first so two admins cannot both act on it.
    const previous = { status: report.status, decision: report.decision, decided_by: report.decided_by, decided_at: report.decided_at, decision_note: report.decision_note };
    const now = new Date();
    const [claimed] = await db.ContentReport.update(
      { status: spec.status, decision: spec.decision, decided_by: actor.id, decided_at: now, decision_note: reason || null, updated_at: now },
      { where: { id: report.id, status: report.status } }
    );
    if (!claimed) throw new ModerationError(409, 'Another admin has just decided this report.', 'REPORT_CLOSED');

    const details = {};
    const reopen = async () => {
      try {
        await db.ContentReport.update({ ...previous, updated_at: new Date() }, { where: { id: report.id } });
      } catch (undo) {
        console.error('[ModerationService] could not reopen report:', undo.message);
      }
    };

    // 1. Removal first. It is idempotent (already removed -> no change, no
    //    second notice), so if the sanction below fails and the admin retries,
    //    nothing happens twice.
    if (action === 'remove_content' || alsoRemove) {
      try {
        const removal = await removeContent(report, { wsService: opts.wsService });
        details.removed = removal.removed;
        if (removal.changed && report.target_type !== 'blocked_message') await notifyRemoval(author, report, reason);
      } catch (e) {
        await reopen();
        throw e;
      }
    }

    // 2. The sanction. Once it has succeeded the report stays decided: nothing
    //    after this point may hand the report back for a second sanction.
    if (spec.sanction) {
      try {
        const existing = await db.UserSanction.findOne({ where: { report_id: report.id, action: spec.sanction, user_id: report.target_user_id } });
        const sanction = existing ? plain(existing) : (await Sanctions.apply(report.target_user_id, spec.sanction, actor, {
          reason,
          days: action === 'suspend' ? Number(opts.days) : undefined,
          source: 'moderation',
          reportId: report.id,
          context: ctx,
          wsService: opts.wsService,
        })).sanction;
        if (existing) details.sanction_reused = true;
        details.sanction_id = sanction && sanction.id;
        if (sanction && sanction.ends_at) details.ends_at = sanction.ends_at;
        if (spec.sanction === 'suspend') details.days = Number(opts.days);
        if (spec.sanction === 'warn' && !existing) {
          emailAuthor(author, 'A warning from the Protocall moderation team', `<p>Hello ${esc(userName(author))},</p><p>You have received a warning: ${esc(reason)}.</p><p>Further violations may lead to suspension.</p>`);
        }
      } catch (e) {
        await reopen();
        if (details.removed) {
          // The content is gone even though the report went back to the queue: say so in the history.
          await recordAction({
            moderator_id: actor.id, report_id: report.id, action: 'remove_content',
            target_type: report.target_type, target_id: report.target_id, target_user_id: report.target_user_id,
            outcome: previous.status, note: reason || null,
            details: { removed: true, partial: true, failed_action: action },
          }, ctx);
        }
        throw e;
      }
    }

    if (details.removed) {
      const closed = await closeSiblings(report, actor, reason || null);
      if (closed) details.closed_reports = closed;
    }
    if (opts.bulk) details.bulk = true;

    await recordAction({
      moderator_id: actor.id,
      report_id: report.id,
      action,
      target_type: report.target_type,
      target_id: report.target_id,
      target_user_id: report.target_user_id,
      outcome: spec.status,
      note: reason || null,
      details: Object.keys(details).length ? details : null,
    }, ctx);

    return { id: report.id, status: spec.status, decision: spec.decision, decided_at: now, details };
  });
}

/** Queue-level actions on many reports; each one is decided (and logged) on its own. */
async function bulkDecide(ids, action, actor, opts = {}) {
  if (!BULK_ACTIONS.includes(action)) throw new ModerationError(400, 'This action cannot be applied in bulk.');
  if (!Array.isArray(ids) || !ids.length) throw new ModerationError(400, 'Select at least one report.');
  if (ids.length > MAX_BULK) throw new ModerationError(400, `Select at most ${MAX_BULK} reports.`);
  const unique = [...new Set(ids)].filter((id) => typeof id === 'string' && UUID_RE.test(id));
  if (!unique.length) throw new ModerationError(400, 'Select at least one report.');
  if (ACTIONS[action].needsReason && !cleanText(opts.reason, MAX_NOTE)) throw new ModerationError(400, 'A reason is required for this action.');
  if (!(await schemaReady())) throw MIGRATION_PENDING();

  const results = [];
  for (const id of unique) {
    try {
      const r = await decide(id, action, actor, { ...opts, bulk: true });
      results.push({ id, ok: true, status: r.status, decision: r.decision });
    } catch (e) {
      if (!(e instanceof ModerationError || e instanceof Sanctions.SanctionError)) {
        console.error('[ModerationService] bulk item failed:', e.message);
      }
      if (e && e.code === 'MIGRATION_PENDING') throw e;
      results.push({ id, ok: false, error: e && e.status && e.status < 500 ? e.message : 'Could not apply this action.' });
    }
  }
  return { results, succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
async function listHistory(query = {}) {
  return guarded(async () => {
    const where = {};
    if (Object.prototype.hasOwnProperty.call(ACTIONS, query.action)) where.action = query.action;
    for (const key of ['moderator_id', 'target_user_id', 'report_id']) {
      if (typeof query[key] === 'string' && UUID_RE.test(query[key])) where[key] = query[key];
    }
    const range = {};
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if (from && !Number.isNaN(from.getTime())) range[Op.gte] = from;
    if (to && !Number.isNaN(to.getTime())) range[Op.lte] = to;
    if (Object.getOwnPropertySymbols(range).length) where.created_at = range;

    const { page, limit, offset } = parsePage(query);
    const { rows, count } = await db.ModerationAction.findAndCountAll({ where, order: [['created_at', 'DESC']], limit, offset });
    const items = rows.map(plain);
    const users = await usersById(items.flatMap((a) => [a.moderator_id, a.target_user_id]));
    return {
      items: items.map((a) => ({
        ...a,
        moderator: publicUser(users.get(String(a.moderator_id))),
        target_user: publicUser(users.get(String(a.target_user_id))),
      })),
      total: count,
      page,
      limit,
    };
  });
}

module.exports = {
  createReport,
  createAutoFlag,
  listMine,
  listReports,
  getReport,
  decide,
  bulkDecide,
  listHistory,
  requireSchema,
  schemaReady,
  ModerationError,
  REASONS,
  ACTIONS,
  BULK_ACTIONS,
  _resetSchema: () => { schemaState = null; },
};
