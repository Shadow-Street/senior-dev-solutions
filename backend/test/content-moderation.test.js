const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Op } = require('sequelize');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const AuthService = require('../src/services/AuthService');
const Moderation = require('../src/services/ModerationService');
const schemaGuard = require('../src/utils/schemaGuard');

// PPT slide 9: members report content, admins review a real queue, decide each
// report (approve / reject / remove / warn / suspend / block / escalate), and
// every decision lands in the moderation history and the audit log.

const AUTHOR = { id: '44444444-4444-4444-8444-444444444444', email: 'author@example.test', name: 'Author', app_role: 'user', role: 'user', status: 'active' };
const REPORTER2 = { id: '66666666-6666-4666-8666-666666666666', email: 'r2@example.test', name: 'Second', app_role: 'user', role: 'user', status: 'active' };
const OTHER_ADMIN = { id: '55555555-5555-4555-8555-555555555555', email: 'a2@example.test', name: 'Admin Two', app_role: 'admin', role: 'admin', status: 'active' };
const SUB_ADMIN = { id: '77777777-7777-4777-8777-777777777777', email: 'sub@example.test', app_role: 'sub_admin', role: 'sub_admin', status: 'active' };
const ROOM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRIVATE_ROOM_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MSG_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PRIVATE_MSG_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const POST_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ADVISOR_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const LOCKED_POST_ID = '12121212-1212-4212-8212-121212121212';
const PLAN_ID = '13131313-1313-4313-8313-131313131313';
const ADVISOR_USER = { ...AUTHOR, app_role: 'advisor', role: 'advisor' };

/** Minimal where-clause matcher for the in-memory tables below. */
function matches(row, where = {}) {
  for (const [key, cond] of Object.entries(where)) {
    const v = row[key];
    if (Array.isArray(cond)) { if (!cond.map(String).includes(String(v))) return false; continue; }
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if (Op.ne in cond && String(v) === String(cond[Op.ne])) return false;
      continue;
    }
    if (String(v ?? null) !== String(cond ?? null)) return false;
  }
  return true;
}

const asRow = (r) => (r ? { ...r, toJSON: () => ({ ...r }) } : null);

let reports;
let actions;
let audits;
let notifications;
let sanctions;
let messages;
let posts;
let userUpdates;
let broadcasts;
let nextId;
let subscribers;

function installFakes() {
  const qi = db.sequelize.getQueryInterface();
  // Every table "exists" with every column, so neither schema guard degrades.
  mock.method(qi, 'describeTable', async () => Object.fromEntries(['id', ...schemaGuard.POST_COLUMNS_014].map((c) => [c, {}])));
  Moderation._resetSchema();
  schemaGuard._reset();

  mock.method(db.ContentReport, 'findOne', async ({ where }) => asRow(reports.find((r) => matches(r, where))));
  mock.method(db.ContentReport, 'findByPk', async (id) => asRow(reports.find((r) => r.id === id)));
  mock.method(db.ContentReport, 'create', async (row) => {
    const created = { id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`, ...row };
    reports.push(created);
    return asRow(created);
  });
  mock.method(db.ContentReport, 'update', async (values, { where }) => {
    let n = 0;
    for (const r of reports) if (matches(r, where)) { Object.assign(r, values); n += 1; }
    return [n];
  });
  mock.method(db.ContentReport, 'findAll', async ({ where } = {}) => reports.filter((r) => matches(r, where)).map(asRow));
  mock.method(db.ContentReport, 'findAndCountAll', async ({ where, limit, offset }) => {
    const plainWhere = { ...where };
    const rows = reports.filter((r) => matches(r, plainWhere));
    return { rows: rows.slice(offset, offset + limit).map(asRow), count: rows.length };
  });
  mock.method(db.ContentReport, 'count', async ({ group }) => {
    const key = group[0];
    const out = {};
    for (const r of reports) out[r[key]] = (out[r[key]] || 0) + 1;
    return Object.entries(out).map(([k, count]) => ({ [key]: k, count }));
  });

  mock.method(db.ModerationAction, 'create', async (row) => { actions.push(row); return asRow(row); });
  mock.method(db.ModerationAction, 'findAll', async ({ where }) => actions.filter((a) => matches(a, where)).map(asRow));
  mock.method(db.ModerationAction, 'findAndCountAll', async ({ where, limit, offset }) => {
    const rows = actions.filter((a) => matches(a, where));
    return { rows: rows.slice(offset, offset + limit).map(asRow), count: rows.length };
  });
  mock.method(db.AuditLog, 'create', async (row) => { audits.push(row); return row; });
  mock.method(db.Notification, 'create', async (row) => { notifications.push(row); return row; });

  mock.method(db.Message, 'findByPk', async (id) => asRow(messages.find((m) => m.id === id)));
  mock.method(db.Message, 'update', async (values, { where }) => {
    const m = messages.find((x) => x.id === where.id);
    if (m) Object.assign(m, values);
    return [m ? 1 : 0];
  });
  mock.method(db.AdvisorPost, 'findByPk', async (id) => asRow(posts.find((p) => p.id === id)));
  mock.method(db.AdvisorPost, 'update', async (values, { where }) => {
    const p = posts.find((x) => x.id === where.id);
    if (p) Object.assign(p, values);
    return [p ? 1 : 0];
  });
  mock.method(db.AdvisorPost, 'findOne', async ({ where }) => {
    const p = posts.find((x) => matches(x, where));
    return p ? { ...p, toJSON: () => ({ ...p }), update: async (values) => { Object.assign(p, values); } } : null;
  });
  mock.method(db.Advisor, 'findByPk', async (id) => (id === ADVISOR_ID ? { id, user_id: AUTHOR.id, status: 'approved' } : null));
  mock.method(db.Advisor, 'findOne', async ({ where }) => (where.user_id === AUTHOR.id ? { id: ADVISOR_ID, user_id: AUTHOR.id, status: 'approved' } : null));
  mock.method(db.SubscriptionPlan, 'findAll', async () => [{ id: PLAN_ID, price: 999 }]);
  mock.method(db.Subscription, 'findAll', async ({ where }) => (subscribers.includes(where.user_id) ? [{ user_id: where.user_id, plan_id: PLAN_ID, status: 'active' }] : []));
  mock.method(db.ChatRoom, 'findByPk', async (id) => {
    if (id === ROOM_ID) return { id, name: 'Nifty Traders', is_public: true };
    if (id === PRIVATE_ROOM_ID) return { id, name: 'Private', is_public: false, owner_id: 'someone-else' };
    return null;
  });
  mock.method(db.ChatRoom, 'findAll', async () => [{ id: ROOM_ID, name: 'Nifty Traders', toJSON: () => ({ id: ROOM_ID, name: 'Nifty Traders' }) }]);
  mock.method(db.ChatRoomParticipant, 'findOne', async () => null);
  const everyone = [USERS.user, USERS.admin, USERS.superAdmin, AUTHOR, REPORTER2, OTHER_ADMIN];
  mock.method(db.User, 'findAll', async ({ where }) => everyone.filter((u) => !where.id || where.id.includes(u.id)).map(asRow));

  // UserSanctionService dependencies.
  mock.method(db.UserSanction, 'create', async (row) => { const s = { id: `s${sanctions.length + 1}`, ...row }; sanctions.push(s); return asRow(s); });
  mock.method(db.UserSanction, 'update', async () => [1]);
  mock.method(db.UserSanction, 'destroy', async ({ where }) => { sanctions = sanctions.filter((x) => x.id !== where.id); return 1; });
  mock.method(db.UserSanction, 'findOne', async ({ where }) => asRow(sanctions.find((x) => matches(x, where))));
  mock.method(db.UserSanction, 'findAll', async ({ where }) => sanctions.filter((s) => s.user_id === where.user_id).map(asRow));
  mock.method(db.UserSanction, 'count', async ({ where }) => sanctions.filter((s) => s.user_id === where.user_id && s.action === where.action).length);
  mock.method(db.User, 'update', async (values, opts) => { userUpdates.push({ values, where: opts.where }); return [1]; });
  mock.method(AuthService, 'revokeAllForUser', async () => {});
}

const ws = () => ({
  broadcastToRoom: (roomId, data) => broadcasts.push({ roomId, data }),
  disconnectUser: () => 1,
});

beforeEach(() => {
  reports = [];
  actions = [];
  audits = [];
  notifications = [];
  sanctions = [];
  userUpdates = [];
  broadcasts = [];
  nextId = 1;
  subscribers = [];
  messages = [
    { id: MSG_ID, chat_room_id: ROOM_ID, user_id: AUTHOR.id, content: 'Send me your OTP <script>x</script>', message_type: 'text', is_deleted: false },
    { id: PRIVATE_MSG_ID, chat_room_id: PRIVATE_ROOM_ID, user_id: AUTHOR.id, content: 'secret', message_type: 'text', is_deleted: false },
  ];
  posts = [
    { id: POST_ID, advisor_id: ADVISOR_ID, title: 'Buy XYZ', content: 'Guaranteed 10x', status: 'published', visibility: 'public' },
    { id: LOCKED_POST_ID, advisor_id: ADVISOR_ID, title: 'Pro call', content: 'subscriber-only text', status: 'published', visibility: 'subscribers', required_plan_id: PLAN_ID },
  ];
  stubUserLookup({ [AUTHOR.id]: AUTHOR, [REPORTER2.id]: REPORTER2, [OTHER_ADMIN.id]: OTHER_ADMIN, [SUB_ADMIN.id]: SUB_ADMIN });
  installFakes();
});
afterEach(() => mock.restoreAll());

const report = (as, body) => request(app).post('/api/reports/content').set('Authorization', bearer(as)).send(body);
const decide = (as, id, body) => request(app).post(`/api/moderation/reports/${id}/decision`).set('Authorization', bearer(as)).send(body);
const reportMessage = (as = USERS.user, extra = {}) => report(as, { target_type: 'message', target_id: MSG_ID, reason: 'scam', note: 'asks for OTP', ...extra });

/**
 * Puts a report straight into the queue. Queue and decision tests use this
 * rather than POST /reports/content so they do not spend the reporters'
 * (process-wide) rate-limit budget.
 */
const SEEDS = {
  message: () => ({ target_type: 'message', target_id: MSG_ID, target_user_id: AUTHOR.id, reason: 'scam', severity: 'critical', content_snapshot: messages[0].content, context: { chat_room_id: ROOM_ID } }),
  post: () => ({ target_type: 'advisor_post', target_id: POST_ID, target_user_id: AUTHOR.id, reason: 'misinformation', severity: 'medium', content_snapshot: 'Buy XYZ', context: { advisor_id: ADVISOR_ID } }),
  user: (id = AUTHOR.id) => ({ target_type: 'user', target_id: id, target_user_id: id, reason: 'harassment', severity: 'high', content_snapshot: null, context: {} }),
};
function seed(kind, overrides = {}) {
  const base = typeof kind === 'function' ? kind() : SEEDS[kind]();
  const row = {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
    reporter_id: USERS.user.id, source: 'user', note: null, status: 'pending', decision: null,
    created_at: new Date(), ...base, ...overrides,
  };
  reports.push(row);
  return row;
}

describe('member reports', () => {
  test('a member reports a chat message: snapshot, author and severity are set server-side', async () => {
    const res = await reportMessage(USERS.user, { severity: 'low', status: 'resolved', reporter_id: AUTHOR.id, target_user_id: USERS.admin.id });
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.body).sort(), ['created_at', 'duplicate', 'id', 'status']);
    const row = reports[0];
    assert.equal(row.reporter_id, USERS.user.id);
    assert.equal(row.target_user_id, AUTHOR.id);
    assert.equal(row.severity, 'critical');
    assert.equal(row.status, 'pending');
    assert.equal(row.source, 'user');
    assert.equal(row.content_snapshot, messages[0].content);
    assert.equal(row.context.chat_room_id, ROOM_ID);
  });

  test('a repeat report from the same member is collapsed onto the first', async () => {
    const first = await reportMessage();
    const again = await reportMessage(USERS.user, { reason: 'spam' });
    assert.equal(again.status, 200);
    assert.equal(again.body.duplicate, true);
    assert.equal(again.body.id, first.body.id);
    assert.equal(reports.length, 1);
    const other = await reportMessage(REPORTER2);
    assert.equal(other.status, 201);
    assert.equal(reports.length, 2);
  });

  test('posts and users can be reported; validation and own-content are refused', async () => {
    assert.equal((await report(USERS.user, { target_type: 'advisor_post', target_id: POST_ID, reason: 'misinformation' })).status, 201);
    assert.equal(reports[0].target_user_id, AUTHOR.id);
    assert.match(reports[0].content_snapshot, /Buy XYZ/);
    assert.equal((await report(USERS.user, { target_type: 'user', target_id: AUTHOR.id, reason: 'harassment' })).status, 201);
    assert.equal((await report(USERS.user, { target_type: 'poll', target_id: MSG_ID, reason: 'spam' })).status, 400);
    assert.equal((await report(USERS.user, { target_type: 'message', target_id: 'nope', reason: 'spam' })).status, 400);
    assert.equal((await report(USERS.user, { target_type: 'message', target_id: MSG_ID, reason: 'bad' })).status, 400);
    assert.equal((await report(USERS.user, { target_type: 'message', target_id: MSG_ID, reason: 'other' })).status, 400, 'other needs a note');
    const own = await report(AUTHOR, { target_type: 'message', target_id: MSG_ID, reason: 'spam' });
    assert.equal(own.status, 400);
    assert.equal(own.body.code, 'SELF');
  });

  test('a message in a room the reporter cannot read is a 404, and anonymous callers are refused', async () => {
    assert.equal((await report(USERS.user, { target_type: 'message', target_id: PRIVATE_MSG_ID, reason: 'spam' })).status, 404);
    assert.equal((await request(app).post('/api/reports/content').send({ target_type: 'message', target_id: MSG_ID, reason: 'spam' })).status, 401);
  });

  test('the reporter\'s own list never exposes the reported person or snapshot', async () => {
    await reportMessage();
    mock.method(db.ContentReport, 'findAll', async ({ where, attributes }) => {
      assert.deepEqual(where, { reporter_id: USERS.user.id });
      assert.ok(!attributes.includes('target_user_id') && !attributes.includes('content_snapshot'));
      return [];
    });
    assert.equal((await request(app).get('/api/reports/content/mine').set('Authorization', bearer(USERS.user))).status, 200);
  });

  test('the chat filter flag is always about the caller, whatever the body says', async () => {
    const res = await request(app).post('/api/moderation/flags').set('Authorization', bearer(USERS.user))
      .send({ chat_room_id: ROOM_ID, content: 'call 9999999999', violation_type: 'personal_info', severity: 'high', user_id: AUTHOR.id, target_user_id: AUTHOR.id });
    assert.equal(res.status, 201);
    assert.equal(reports[0].target_user_id, USERS.user.id);
    assert.equal(reports[0].source, 'auto');
    assert.equal(reports[0].target_type, 'blocked_message');
    assert.equal(reports[0].reporter_id, null);
    assert.equal((await request(app).post('/api/moderation/flags').set('Authorization', bearer(USERS.user)).send({ content: 'x', violation_type: 'anything' })).status, 400);
  });

  test('a subscriber-only post is reportable only by someone it is unlocked for', async () => {
    const locked = await report(USERS.user, { target_type: 'advisor_post', target_id: LOCKED_POST_ID, reason: 'misinformation' });
    assert.equal(locked.status, 404);
    assert.equal(reports.length, 0, 'no snapshot of text the reporter never saw');
    subscribers = [REPORTER2.id];
    const ok = await report(REPORTER2, { target_type: 'advisor_post', target_id: LOCKED_POST_ID, reason: 'misinformation' });
    assert.equal(ok.status, 201);
    assert.match(reports[0].content_snapshot, /subscriber-only text/);
  });

  test('an unknown user id answers like a real report (no id probing) and stores nothing', async () => {
    const ghost = await report(REPORTER2, { target_type: 'user', target_id: '99999999-9999-4999-8999-999999999999', reason: 'spam' });
    const real = await report(REPORTER2, { target_type: 'user', target_id: AUTHOR.id, reason: 'spam' });
    assert.equal(ghost.status, real.status);
    assert.deepEqual(Object.keys(ghost.body).sort(), Object.keys(real.body).sort());
    assert.equal(ghost.body.status, 'pending');
    assert.equal(reports.length, 1);
  });

  test('a repeat report on an unknown id looks exactly like a real duplicate (review N-2)', async () => {
    const ghostId = '99999999-9999-4999-8999-999999999998';
    const g1 = await report(REPORTER2, { target_type: 'user', target_id: ghostId, reason: 'spam' });
    const g2 = await report(REPORTER2, { target_type: 'user', target_id: ghostId, reason: 'spam' });
    const r1 = await report(REPORTER2, { target_type: 'user', target_id: AUTHOR.id, reason: 'harassment' });
    const r2 = await report(REPORTER2, { target_type: 'user', target_id: AUTHOR.id, reason: 'harassment' });
    assert.equal(g1.status, r1.status);
    assert.equal(g2.status, r2.status);
    assert.equal(g2.body.duplicate, r2.body.duplicate);
    assert.equal(g2.body.id, g1.body.id, 'the repeat returns the first id, as a real duplicate does');
  });

  test('reporting is rate limited per account', async () => {
    const spammer = { id: '88888888-8888-4888-8888-888888888888', email: 's@example.test', app_role: 'user', role: 'user', status: 'active' };
    db.User.findByPk.mock.restore();
    stubUserLookup({ [spammer.id]: spammer, [AUTHOR.id]: AUTHOR });
    let last;
    for (let i = 0; i < 21; i += 1) last = await report(spammer, { target_type: 'user', target_id: AUTHOR.id, reason: 'spam' });
    assert.equal(last.status, 429);
  });
});

describe('admin queue', () => {
  test('only admins see the queue; members and sub-admins are refused', async () => {
    assert.equal((await request(app).get('/api/moderation/reports').set('Authorization', bearer(USERS.user))).status, 403);
    assert.equal((await request(app).get('/api/moderation/reports').set('Authorization', bearer(SUB_ADMIN))).status, 403);
    assert.equal((await request(app).get('/api/moderation/history').set('Authorization', bearer(USERS.user))).status, 403);
    assert.equal((await request(app).post(`/api/moderation/reports/${MSG_ID}/decision`).set('Authorization', bearer(USERS.user)).send({ action: 'approve' })).status, 403);
    assert.equal((await request(app).get('/api/moderation/reports')).status, 401);
  });

  test('lists reports with the reporter (admins only), author, room and correct counters', async () => {
    seed('message');
    seed('user', { reason: 'spam', severity: 'low', status: 'dismissed' });
    const res = await request(app).get('/api/moderation/reports?status=pending&page=1&limit=10').set('Authorization', bearer(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].reporter.id, USERS.user.id);
    assert.equal(res.body.items[0].target_user.id, AUTHOR.id);
    assert.equal(res.body.items[0].room.name, 'Nifty Traders');
    assert.equal(res.body.counts.total, 2);
    assert.equal(res.body.counts.pending, 1);
    assert.equal(res.body.counts.dismissed, 1);
    assert.equal(res.body.counts.critical, 1);
    assert.equal(res.body.counts.low, 1);
    assert.equal(res.body.items[0].reporter.password, undefined);
  });

  test('search and filters build a whitelisted query with LIKE wildcards escaped', async () => {
    let seen;
    mock.method(db.ContentReport, 'findAndCountAll', async (opts) => { seen = opts; return { rows: [], count: 0 }; });
    await request(app).get('/api/moderation/reports?q=50%25_off&severity=high&reason=spam&status=open&target_type=message&source=user&limit=1000&evil=1')
      .set('Authorization', bearer(USERS.admin));
    assert.deepEqual(seen.where.status, ['pending', 'escalated']);
    assert.equal(seen.where.severity, 'high');
    assert.equal(seen.where.reason, 'spam');
    assert.equal(seen.where.evil, undefined);
    assert.equal(seen.limit, 100);
    assert.equal(seen.where[Op.or][0].content_snapshot[Op.like], '%50\\%\\_off%');
  });

  test('answers 503 MIGRATION_PENDING until migration 019 is applied', async () => {
    Moderation._resetSchema();
    mock.method(db.sequelize.getQueryInterface(), 'describeTable', async () => { throw new Error("Table 'test_db.content_reports' doesn't exist"); });
    const res = await request(app).get('/api/moderation/reports').set('Authorization', bearer(USERS.admin));
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'MIGRATION_PENDING');
    Moderation._resetSchema();
  });

  test('review detail shows the author\'s prior warnings and sanctions', async () => {
    seed('message');
    sanctions.push({ id: 's0', user_id: AUTHOR.id, action: 'warn', reason: 'earlier spam', actor_id: USERS.admin.id, created_at: new Date() });
    const res = await request(app).get(`/api/moderation/reports/${reports[0].id}`).set('Authorization', bearer(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.author.warnings, 1);
    assert.equal(res.body.author.sanctions[0].reason, 'earlier spam');
    assert.equal(res.body.target.removed, false);
  });
});

describe('decisions', () => {
  test('approve: content is fine, report dismissed, history + audit recorded', async () => {
    seed('message');
    const id = reports[0].id;
    const res = await decide(USERS.admin, id, { action: 'approve', reason: 'not a scam', status: 'resolved', decided_by: AUTHOR.id });
    assert.equal(res.status, 200);
    assert.equal(reports[0].status, 'dismissed');
    assert.equal(reports[0].decision, 'approved');
    assert.equal(reports[0].decided_by, USERS.admin.id);
    assert.equal(messages[0].is_deleted, false);
    assert.equal(actions[0].action, 'approve');
    assert.equal(actions[0].moderator_id, USERS.admin.id);
    assert.equal(actions[0].report_id, id);
    assert.equal(audits[0].action, 'moderation_approve');
    // A decided report cannot be decided again.
    const again = await decide(USERS.admin, id, { action: 'reject' });
    assert.equal(again.status, 409);
  });

  test('reject and escalate', async () => {
    seed('message');
    seed('message', { reporter_id: REPORTER2.id });
    assert.equal((await decide(USERS.admin, reports[0].id, { action: 'reject' })).status, 200);
    assert.equal(reports[0].decision, 'rejected');
    assert.equal(reports[0].status, 'dismissed');
    assert.equal((await decide(USERS.admin, reports[1].id, { action: 'escalate', reason: 'needs super admin' })).status, 200);
    assert.equal(reports[1].status, 'escalated');
    assert.equal((await decide(USERS.admin, reports[1].id, { action: 'escalate' })).status, 409);
  });

  test('remove content: soft-deletes the message, tells the room and the author, closes sibling reports', async () => {
    seed('message');
    seed('message', { reporter_id: REPORTER2.id });
    assert.equal((await decide(USERS.admin, reports[0].id, { action: 'remove_content' })).status, 400, 'reason required');
    const res = await request(app).post(`/api/moderation/reports/${reports[0].id}/decision`).set('Authorization', bearer(USERS.admin))
      .send({ action: 'remove_content', reason: 'Phishing for OTPs' });
    assert.equal(res.status, 200);
    assert.equal(messages[0].is_deleted, true);
    assert.equal(messages[0].content, '');
    assert.equal(reports[0].decision, 'removed');
    assert.equal(reports[1].status, 'resolved', 'the second report on the same message is closed too');
    assert.equal(notifications[0].user_id, AUTHOR.id);
    assert.equal(notifications[0].type, 'content_removed');
    assert.equal(actions[0].details.closed_reports, 1);
  });

  test('remove content on an advisor post archives it (off every published feed)', async () => {
    seed('post');
    assert.equal((await decide(USERS.admin, reports[0].id, { action: 'remove_content', reason: 'Guaranteed returns claim' })).status, 200);
    assert.equal(posts[0].status, 'archived');
  });

  test('warn goes through UserSanctionService with the report id and notifies the author', async () => {
    seed('message');
    const res = await decide(USERS.admin, reports[0].id, { action: 'warn', reason: 'No soliciting OTPs' });
    assert.equal(res.status, 200);
    assert.equal(sanctions[0].action, 'warn');
    assert.equal(sanctions[0].source, 'moderation');
    assert.equal(sanctions[0].report_id, reports[0].id);
    assert.equal(notifications[0].type, 'account_warn');
    assert.equal(reports[0].decision, 'warned');
    assert.equal(messages[0].is_deleted, false);
  });

  test('suspend validates 1..365 days and can also remove the content', async () => {
    seed('message');
    const id = reports[0].id;
    for (const days of [0, 366, 'x', undefined]) {
      assert.equal((await decide(USERS.admin, id, { action: 'suspend', reason: 'spam', days })).status, 400, String(days));
    }
    assert.equal(reports[0].status, 'pending');
    const res = await decide(USERS.admin, id, { action: 'suspend', reason: 'Repeated scams', days: 7, also_remove: true });
    assert.equal(res.status, 200);
    assert.equal(sanctions[0].action, 'suspend');
    assert.deepEqual(userUpdates[0].values, { status: 'suspended' });
    assert.equal(messages[0].is_deleted, true);
    assert.equal(reports[0].decision, 'suspended');
    assert.equal(actions[0].details.days, 7);
  });

  test('ban blocks the account', async () => {
    seed('message');
    assert.equal((await decide(USERS.admin, reports[0].id, { action: 'ban', reason: 'Fraud' })).status, 200);
    assert.deepEqual(userUpdates[0].values, { status: 'banned' });
    assert.equal(reports[0].decision, 'banned');
  });

  test('a failed sanction puts the report back in the queue unchanged', async () => {
    seed(() => SEEDS.user(OTHER_ADMIN.id));
    const res = await decide(USERS.superAdmin, reports[0].id, { action: 'ban', reason: 'x' });
    assert.equal(res.status, 200, 'a super admin may block an admin');
    seed(() => SEEDS.user(USERS.superAdmin.id), { reporter_id: REPORTER2.id });
    const refused = await decide(USERS.admin, reports[1].id, { action: 'ban', reason: 'x' });
    assert.equal(refused.status, 403);
    assert.equal(reports[1].status, 'pending');
    assert.equal(actions.length, 1);
  });

  test('no self-moderation; staff content needs a super admin; own reports need another admin', async () => {
    seed(() => SEEDS.user(USERS.admin.id));
    const self = await decide(USERS.admin, reports[0].id, { action: 'reject' });
    assert.equal(self.status, 403);
    assert.equal(self.body.code, 'SELF');

    seed(() => SEEDS.user(OTHER_ADMIN.id));
    const staff = await decide(USERS.admin, reports[1].id, { action: 'warn', reason: 'x' });
    assert.equal(staff.status, 403);
    assert.equal(staff.body.code, 'PROTECTED');
    assert.equal((await decide(USERS.admin, reports[1].id, { action: 'escalate' })).status, 200, 'any admin may escalate');

    seed('message', { reporter_id: OTHER_ADMIN.id });
    const own = await decide(OTHER_ADMIN, reports[2].id, { action: 'approve' });
    assert.equal(own.status, 403);
    assert.equal(own.body.code, 'OWN_REPORT');
  });

  test('a user report has no content to remove', async () => {
    seed('user');
    const res = await decide(USERS.admin, reports[0].id, { action: 'remove_content', reason: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'NOTHING_TO_REMOVE');
    assert.equal(reports[0].status, 'pending');
  });

  test('bulk: approve / reject / escalate / remove only, each logged; per-item failures reported', async () => {
    seed('message');
    seed('message', { reporter_id: REPORTER2.id });
    seed(() => SEEDS.user(USERS.admin.id));
    const bulk = (body) => request(app).post('/api/moderation/reports/bulk').set('Authorization', bearer(USERS.admin)).send(body);
    assert.equal((await bulk({ ids: [reports[0].id], action: 'ban', reason: 'x' })).status, 400);
    assert.equal((await bulk({ ids: [], action: 'reject' })).status, 400);
    const res = await bulk({ ids: reports.map((r) => r.id), action: 'reject' });
    assert.equal(res.status, 200);
    assert.equal(res.body.succeeded, 2);
    assert.equal(res.body.failed, 1, 'the report about the acting admin is refused');
    assert.equal(actions.length, 2);
    assert.ok(actions.every((a) => a.details && a.details.bulk === true));
  });
});

describe('moderation lock on removed advisor posts (M-2)', () => {
  const asAdvisor = () => {
    db.User.findByPk.mock.restore();
    stubUserLookup({ [AUTHOR.id]: ADVISOR_USER });
  };

  test('the advisor cannot republish or edit a post a moderator removed; staff can lift it', async () => {
    seed('post');
    assert.equal((await decide(USERS.admin, reports[0].id, { action: 'remove_content', reason: 'Guaranteed returns claim' })).status, 200);
    assert.equal(posts[0].status, 'archived');

    asAdvisor();
    for (const body of [{ status: 'published' }, { title: 'Same post, new title' }, { status: 'draft' }]) {
      const res = await request(app).put(`/api/advisors/posts/${POST_ID}`).set('Authorization', bearer(ADVISOR_USER)).send(body);
      assert.equal(res.status, 403, JSON.stringify(body));
      assert.equal(res.body.code, 'MODERATION_LOCKED');
    }
    assert.equal(posts[0].status, 'archived');
    assert.equal(posts[0].title, 'Buy XYZ');

    // Not locked: the advisor can still edit their other posts.
    const other = await request(app).put(`/api/advisors/posts/${LOCKED_POST_ID}`).set('Authorization', bearer(ADVISOR_USER)).send({ title: 'Edited' });
    assert.equal(other.status, 200);

    const lifted = await request(app).put(`/api/advisors/posts/${POST_ID}`).set('Authorization', bearer(USERS.admin)).send({ status: 'published' });
    assert.equal(lifted.status, 200);
    assert.equal(posts[0].status, 'published');
  });
});

describe('remove + sanction ordering (S3)', () => {
  test('the removal runs first; a failed sanction reopens the report, keeps the removal on record, and a retry sanctions once', async () => {
    seed('message');
    const id = reports[0].id;
    const realApply = db.User.update;
    let failNext = true;
    db.User.update.mock.restore();
    mock.method(db.User, 'update', async (values, opts) => {
      if (failNext) { failNext = false; throw new Error('connection lost'); }
      return realApply(values, opts);
    });

    const first = await decide(USERS.admin, id, { action: 'suspend', reason: 'Repeated scams', days: 7, also_remove: true });
    assert.equal(first.status, 500);
    assert.equal(messages[0].is_deleted, true, 'content stays removed');
    assert.equal(reports[0].status, 'pending', 'report back in the queue');
    assert.deepEqual(sanctions, []);
    assert.equal(notifications.filter((n) => n.type === 'content_removed').length, 1);
    assert.equal(actions.length, 1);
    assert.deepEqual(actions[0].details, { removed: true, partial: true, failed_action: 'suspend' });

    const retry = await decide(USERS.admin, id, { action: 'suspend', reason: 'Repeated scams', days: 7, also_remove: true });
    assert.equal(retry.status, 200);
    assert.equal(sanctions.filter((x) => x.action === 'suspend').length, 1);
    assert.equal(notifications.filter((n) => n.type === 'content_removed').length, 1, 'no second removal notice');
    assert.equal(reports[0].decision, 'suspended');
  });

  test('a failing removal applies no sanction', async () => {
    seed('message');
    db.Message.update.mock.restore();
    mock.method(db.Message, 'update', async () => { throw new Error('deadlock'); });
    const res = await decide(USERS.admin, reports[0].id, { action: 'ban', reason: 'Fraud', also_remove: true });
    assert.equal(res.status, 500);
    assert.equal(sanctions.length, 0);
    assert.equal(userUpdates.length, 0);
    assert.equal(reports[0].status, 'pending');
  });

  test('a sanction already recorded for this report is reused, never applied twice', async () => {
    seed('message');
    sanctions.push({ id: 'pre', user_id: AUTHOR.id, action: 'warn', report_id: reports[0].id, reason: 'x' });
    const res = await decide(USERS.admin, reports[0].id, { action: 'warn', reason: 'No soliciting OTPs' });
    assert.equal(res.status, 200);
    assert.equal(sanctions.length, 1);
    assert.equal(res.body.details.sanction_id, 'pre');
    assert.equal(res.body.details.sanction_reused, true);
  });
});

describe('history', () => {
  test('lists decisions with moderator and target user, filterable by action', async () => {
    seed('message');
    await decide(USERS.admin, reports[0].id, { action: 'warn', reason: 'first warning' });
    actions[0].created_at = new Date();
    const res = await request(app).get('/api/moderation/history?action=warn').set('Authorization', bearer(USERS.admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].moderator.id, USERS.admin.id);
    assert.equal(res.body.items[0].target_user.id, AUTHOR.id);
    assert.equal(res.body.items[0].note, 'first warning');
  });
});
