/**
 * Poll Management (Super Admin) — listing, moderation and analytics.
 *
 * Vote numbers always come from PollVote rows through utils/pollTally.js, the
 * same reconciliation every user-facing poll read goes through, so the admin
 * screen can never disagree with what members see on a poll card.
 *
 * Status of a poll (one definition, used by the list filter, the stat cards
 * and the analytics):
 *   hidden   is_active === false (suspended by a moderator; members see it
 *            greyed out and cannot vote)
 *   closed   not hidden, and status is set to something other than 'active'
 *            or the end time has passed
 *   active   everything else
 * Featured: is_boosted with a boost_expires_at in the future (the same rule
 * PollCard uses to show the boosted badge).
 */
const db = require('../models');
const { loadTallies, tallyFromRows, applyTally, withTallies } = require('../utils/pollTally');

const POLL_TYPES = ['buy_sell_hold', 'sentiment', 'price_target', 'yes_no', 'admin_recommendation', 'custom'];

// Mirrors defaultOptions() in src/lib/pollVotes.js so a poll created without an
// explicit option list is indexed exactly as the cards label it.
const DEFAULT_OPTIONS = {
  buy_sell_hold: ['Buy', 'Sell', 'Hold'],
  admin_recommendation: ['Buy', 'Sell', 'Hold'],
  sentiment: ['Bullish', 'Bearish', 'Neutral'],
  price_target: ['Yes', 'No'],
  yes_no: ['Yes', 'No'],
};

const STATUSES = ['active', 'closed', 'hidden', 'featured'];
const TYPES = ['premium', 'general', 'admin', 'community'];
const RANGES = ['today', '7d', '30d', '90d', 'all'];
const ADMIN_CREATOR_ROLES = ['admin', 'super_admin'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BUCKETS = 120;
const MAX_VOTE_ROWS = 250000;

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const toDate = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function pollStatus(poll, now = new Date()) {
  if (!poll) return 'closed';
  if (poll.is_active === false || poll.is_active === 0) return 'hidden';
  if (poll.status && poll.status !== 'active') return 'closed';
  const ends = toDate(poll.expires_at);
  if (ends && ends <= now) return 'closed';
  return 'active';
}

function isFeatured(poll, now = new Date()) {
  const until = toDate(poll?.boost_expires_at);
  return Boolean(poll?.is_boosted) && Boolean(until) && until > now;
}

const isAdminPoll = (poll) =>
  Boolean(poll?.created_by_admin) || ADMIN_CREATOR_ROLES.includes(poll?.created_by_role);

/** Adds status / featured / admin flags to a (tallied) plain poll. */
function decorate(poll, now = new Date()) {
  return {
    ...poll,
    admin_status: pollStatus(poll, now),
    is_featured: isFeatured(poll, now),
    is_admin_poll: isAdminPoll(poll),
  };
}

// ---------------------------------------------------------------------------
// Time ranges (client time zone aware)
// ---------------------------------------------------------------------------

/**
 * `tzOffset` is the browser's Date#getTimezoneOffset() in minutes (IST = -330),
 * so "today" and daily buckets follow the admin's calendar, not the server's.
 */
const clampOffset = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && Math.abs(n) <= 840 ? n : 0;
};

const shift = (date, tzOffset) => new Date(date.getTime() - tzOffset * 60000);
const unshift = (date, tzOffset) => new Date(date.getTime() + tzOffset * 60000);

/** Local midnight (as a real instant) of the day containing `date`. */
function startOfLocalDay(date, tzOffset) {
  const local = shift(date, tzOffset);
  local.setUTCHours(0, 0, 0, 0);
  return unshift(local, tzOffset);
}

function rangeStart(range, now = new Date(), tzOffset = 0) {
  const today = startOfLocalDay(now, tzOffset);
  switch (range) {
    case 'today': return today;
    case '7d': return new Date(today.getTime() - 6 * DAY_MS);
    case '30d': return new Date(today.getTime() - 29 * DAY_MS);
    case '90d': return new Date(today.getTime() - 89 * DAY_MS);
    default: return null; // all time
  }
}

/** YYYY-MM-DD of the bucket (day, or the Monday of the week) holding `date`. */
function bucketKey(date, bucket, tzOffset) {
  const local = shift(date, tzOffset);
  if (bucket === 'week') {
    const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
    local.setUTCDate(local.getUTCDate() - dow);
  }
  return local.toISOString().slice(0, 10);
}

function bucketSeries(from, to, bucket, tzOffset) {
  const keys = [];
  const step = bucket === 'week' ? 7 : 1;
  const cursor = new Date(`${bucketKey(from, bucket, tzOffset)}T00:00:00.000Z`);
  const last = bucketKey(to, bucket, tzOffset);
  while (keys.length <= MAX_BUCKETS * 7) {
    const key = cursor.toISOString().slice(0, 10);
    keys.push(key);
    if (key >= last) break;
    cursor.setUTCDate(cursor.getUTCDate() + step);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

const escapeLike = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);

function parseListQuery(query = {}) {
  const pick = (value, allowed) => (allowed.includes(value) ? value : 'all');
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const sort = ['newest', 'oldest', 'ending'].includes(query.sort) ? query.sort : 'newest';
  return {
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '',
    status: pick(query.status, STATUSES),
    type: pick(query.type, TYPES),
    range: pick(query.range, RANGES),
    tzOffset: clampOffset(query.tz),
    page,
    limit,
    sort,
  };
}

/** Sequelize WHERE for the admin list. Same status rules as pollStatus(). */
function buildListWhere(filters, now = new Date()) {
  const { Op } = db.Sequelize;
  const and = [];
  const notHidden = { [Op.or]: [{ is_active: true }, { is_active: null }] };

  if (filters.search) {
    const like = { [Op.like]: `%${escapeLike(filters.search)}%` };
    and.push({
      [Op.or]: [{ title: like }, { question: like }, { stock_symbol: like }, { description: like }],
    });
  }

  switch (filters.status) {
    case 'active':
      and.push(notHidden);
      and.push({ [Op.or]: [{ status: 'active' }, { status: null }] });
      and.push({ [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }] });
      break;
    case 'closed':
      and.push(notHidden);
      and.push({
        [Op.or]: [
          { [Op.and]: [{ status: { [Op.ne]: null } }, { status: { [Op.ne]: 'active' } }] },
          { expires_at: { [Op.lte]: now } },
        ],
      });
      break;
    case 'hidden':
      and.push({ is_active: false });
      break;
    case 'featured':
      and.push({ is_boosted: true }, { boost_expires_at: { [Op.gt]: now } });
      break;
    default:
      break;
  }

  const adminClause = {
    [Op.or]: [{ created_by_admin: true }, { created_by_role: { [Op.in]: ADMIN_CREATOR_ROLES } }],
  };
  const notAdminClause = {
    [Op.and]: [
      { [Op.or]: [{ created_by_admin: false }, { created_by_admin: null }] },
      { [Op.or]: [{ created_by_role: null }, { created_by_role: { [Op.notIn]: ADMIN_CREATOR_ROLES } }] },
    ],
  };
  switch (filters.type) {
    case 'premium':
      and.push({ is_premium: true });
      break;
    case 'general':
      and.push({ [Op.or]: [{ is_premium: false }, { is_premium: null }] });
      break;
    case 'admin':
      and.push(adminClause);
      break;
    case 'community':
      and.push(notAdminClause);
      break;
    default:
      break;
  }

  const since = rangeStart(filters.range, now, filters.tzOffset || 0);
  if (since) and.push({ created_at: { [Op.gte]: since } });

  return and.length ? { [Op.and]: and } : {};
}

const ORDER = {
  newest: [['created_at', 'DESC']],
  oldest: [['created_at', 'ASC']],
  ending: [['expires_at', 'ASC'], ['created_at', 'DESC']],
};

async function listPolls(query, now = new Date()) {
  const filters = parseListQuery(query);
  const { rows, count } = await db.Poll.findAndCountAll({
    where: buildListWhere(filters, now),
    order: ORDER[filters.sort],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
  });
  const tallied = await withTallies(rows || []);
  const total = typeof count === 'number' ? count : (Array.isArray(count) ? count.length : 0);
  return {
    items: tallied.map((p) => decorate(p, now)),
    total,
    page: filters.page,
    limit: filters.limit,
    pages: Math.max(Math.ceil(total / filters.limit), 1),
    filters,
  };
}

// ---------------------------------------------------------------------------
// Summary (stat cards)
// ---------------------------------------------------------------------------

const SUMMARY_ATTRIBUTES = [
  'id', 'options', 'status', 'is_active', 'expires_at', 'is_premium',
  'created_by_admin', 'created_by_role', 'is_boosted', 'boost_expires_at',
];

async function summary(now = new Date()) {
  const polls = await db.Poll.findAll({ attributes: SUMMARY_ATTRIBUTES, raw: true });
  const ids = polls.map((p) => p.id);
  const tallies = await loadTallies(ids);
  let totalVotes = 0;
  const out = { total: polls.length, active: 0, closed: 0, hidden: 0, featured: 0, premium: 0, admin: 0 };
  for (const p of polls) {
    out[pollStatus(p, now)] += 1;
    if (isFeatured(p, now)) out.featured += 1;
    if (p.is_premium) out.premium += 1;
    if (isAdminPoll(p)) out.admin += 1;
    totalVotes += applyTally(p, tallies.get(p.id)).total_votes;
  }
  const uniqueVoters = ids.length
    ? await db.PollVote.count({ where: { poll_id: ids }, distinct: true, col: 'user_id' })
    : 0;
  return {
    ...out,
    total_votes: totalVotes,
    unique_voters: Number(uniqueVoters) || 0,
    avg_votes_per_poll: polls.length ? round1(totalVotes / polls.length) : 0,
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

const round1 = (n) => Math.round(n * 10) / 10;
const voteTime = (row) => toDate(row.voted_at) || toDate(row.created_at);

/**
 * Pure analytics over polls + PollVote rows. Definitions (also shown in the UI):
 *   total_votes        PollVote rows cast in the range (on polls that still exist)
 *   unique_voters      distinct user_id among those rows
 *   turnout_pct        unique_voters / registered users x 100
 *   polls_in_scope     polls created in the range, plus older polls that got votes in it
 *   avg_votes_per_poll total_votes / polls_in_scope
 *   votes_per_voter    total_votes / unique_voters
 *   participation_rate polls_with_votes / polls_in_scope x 100
 *   activity[]         per day (or ISO week): votes, distinct voters, new polls
 */
function computeAnalytics({ polls = [], voteRows = [], registeredUsers = null, range = '30d', bucket = 'auto', tzOffset = 0, now = new Date() }) {
  const since = rangeStart(range, now, tzOffset);
  const byId = new Map(polls.map((p) => [p.id, typeof p.toJSON === 'function' ? p.toJSON() : p]));

  const rows = voteRows.filter((r) => {
    if (!byId.has(r.poll_id)) return false; // votes on deleted polls are not counted
    const t = voteTime(r);
    return !since || (t && t >= since);
  });

  const tallies = tallyFromRows(rows);
  const inScope = [...byId.values()].filter((p) => {
    if (!since) return true;
    const created = toDate(p.created_at);
    return (created && created >= since) || tallies.has(p.id);
  });

  const scoped = inScope.map((p) => decorate(applyTally(p, tallies.get(p.id)), now));
  const voters = new Set(rows.map((r) => r.user_id).filter(Boolean).map(String));
  const totalVotes = rows.length;
  const pollsWithVotes = scoped.filter((p) => p.total_votes > 0).length;

  // Activity over time.
  const times = rows.map(voteTime).filter(Boolean);
  const createdTimes = inScope.map((p) => toDate(p.created_at)).filter(Boolean);
  const earliest = since || [...times, ...createdTimes].reduce((m, t) => (t < m ? t : m), now);
  const spanDays = Math.ceil((now - earliest) / DAY_MS) + 1;
  let unit = bucket === 'day' || bucket === 'week' ? bucket : (spanDays > 90 ? 'week' : 'day');
  if (unit === 'day' && spanDays > MAX_BUCKETS) unit = 'week';
  const keys = bucketSeries(earliest, now, unit, tzOffset).slice(-MAX_BUCKETS);
  const series = new Map(keys.map((k) => [k, { start: k, votes: 0, voters: new Set(), new_polls: 0 }]));
  for (const r of rows) {
    const b = series.get(bucketKey(voteTime(r), unit, tzOffset));
    if (!b) continue;
    b.votes += 1;
    if (r.user_id) b.voters.add(String(r.user_id));
  }
  for (const p of inScope) {
    const created = toDate(p.created_at);
    if (!created || (since && created < since)) continue;
    const b = series.get(bucketKey(created, unit, tzOffset));
    if (b) b.new_polls += 1;
  }
  const activity = [...series.values()].map((b) => ({ start: b.start, votes: b.votes, voters: b.voters.size, new_polls: b.new_polls }));

  // Engagement segments. A voter is counted once per segment.
  const segment = (predicate) => {
    const ps = scoped.filter(predicate);
    const ids = new Set(ps.map((p) => p.id));
    const segRows = rows.filter((r) => ids.has(r.poll_id));
    return {
      polls: ps.length,
      votes: segRows.length,
      voters: new Set(segRows.map((r) => r.user_id).filter(Boolean).map(String)).size,
      avg_votes_per_poll: ps.length ? round1(segRows.length / ps.length) : 0,
    };
  };

  const typeNames = [...new Set(scoped.map((p) => p.poll_type || 'unspecified'))];
  const byType = typeNames
    .map((t) => ({ type: t, ...segment((p) => (p.poll_type || 'unspecified') === t) }))
    .sort((a, b) => b.votes - a.votes);

  const stocks = new Map();
  for (const p of scoped) {
    if (!p.stock_symbol) continue;
    const key = String(p.stock_symbol).toUpperCase();
    const s = stocks.get(key) || { symbol: key, polls: 0, votes: 0 };
    s.polls += 1;
    s.votes += p.total_votes;
    stocks.set(key, s);
  }

  const statusCounts = { active: 0, closed: 0, hidden: 0 };
  for (const p of byId.values()) statusCounts[pollStatus(p, now)] += 1;

  return {
    range,
    since: since ? since.toISOString() : null,
    bucket: unit,
    generated_at: now.toISOString(),
    participation: {
      total_votes: totalVotes,
      unique_voters: voters.size,
      registered_users: registeredUsers,
      turnout_pct: registeredUsers > 0 ? round1((voters.size / registeredUsers) * 100) : null,
      polls_in_scope: scoped.length,
      polls_with_votes: pollsWithVotes,
      participation_rate: scoped.length ? round1((pollsWithVotes / scoped.length) * 100) : 0,
      avg_votes_per_poll: scoped.length ? round1(totalVotes / scoped.length) : 0,
      votes_per_voter: voters.size ? round1(totalVotes / voters.size) : 0,
    },
    status_counts: statusCounts,
    activity,
    segments: {
      premium: segment((p) => Boolean(p.is_premium)),
      general: segment((p) => !p.is_premium),
      admin: segment((p) => p.is_admin_poll),
      community: segment((p) => !p.is_admin_poll),
    },
    by_type: byType,
    top_stocks: [...stocks.values()].sort((a, b) => b.votes - a.votes || b.polls - a.polls).slice(0, 8),
    // Every poll in scope with range-limited counts, most voted first. The UI
    // derives sentiment and consensus from these with src/lib/pollVotes.js.
    polls: scoped.sort((a, b) => b.total_votes - a.total_votes).slice(0, 200),
  };
}

const ANALYTICS_POLL_ATTRIBUTES = [
  'id', 'title', 'question', 'stock_symbol', 'poll_type', 'options', 'status', 'is_active',
  'expires_at', 'is_premium', 'created_by_admin', 'created_by_role', 'is_boosted',
  'boost_expires_at', 'created_at',
];

async function analytics(query = {}, now = new Date()) {
  const range = RANGES.includes(query.range) ? query.range : '30d';
  const bucket = ['day', 'week'].includes(query.bucket) ? query.bucket : 'auto';
  const tzOffset = clampOffset(query.tz);
  const since = rangeStart(range, now, tzOffset);
  const { Op } = db.Sequelize;

  const voteWhere = since
    ? { [Op.or]: [{ voted_at: { [Op.gte]: since } }, { voted_at: null, created_at: { [Op.gte]: since } }] }
    : {};

  const [polls, voteRows, registeredUsers] = await Promise.all([
    db.Poll.findAll({ attributes: ANALYTICS_POLL_ATTRIBUTES, raw: true }),
    db.PollVote.findAll({
      where: voteWhere,
      attributes: ['poll_id', 'user_id', 'option_index', 'voted_at', 'created_at'],
      raw: true,
      limit: MAX_VOTE_ROWS,
    }),
    db.User.count().catch(() => null),
  ]);

  const result = computeAnalytics({ polls, voteRows, registeredUsers, range, bucket, tzOffset, now });
  result.truncated = voteRows.length >= MAX_VOTE_ROWS;
  return result;
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

async function details(id, now = new Date()) {
  const poll = await db.Poll.findByPk(id);
  if (!poll) return null;
  const tallied = decorate(await withTallies(poll), now);

  const votes = await db.PollVote.findAll({
    where: { poll_id: id },
    attributes: ['id', 'user_id', 'option_index', 'voted_at', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 500,
    raw: true,
  });

  const userIds = [...new Set([...votes.map((v) => v.user_id), tallied.created_by].filter(Boolean))];
  const users = userIds.length
    ? await db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'display_name', 'name', 'profile_image_url'],
        raw: true,
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const nameOf = (u) => u?.display_name || u?.name || 'Member';

  const labels = Array.isArray(tallied.options) && tallied.options.length
    ? tallied.options.map((o) => String(o?.label ?? o))
    : (DEFAULT_OPTIONS[tallied.poll_type] || DEFAULT_OPTIONS.buy_sell_hold);

  // Anonymous polls stay anonymous, even here.
  const voters = votes.map((v) => ({
    id: v.id,
    option_index: v.option_index,
    option_label: labels[v.option_index] ?? `Option ${Number(v.option_index) + 1}`,
    voted_at: v.voted_at || v.created_at,
    user: tallied.is_anonymous
      ? { id: null, name: 'Anonymous voter', image: null }
      : { id: v.user_id, name: nameOf(userMap.get(v.user_id)), image: userMap.get(v.user_id)?.profile_image_url || null },
  }));

  let history = [];
  try {
    history = await db.AuditLog.findAll({
      where: { entity_type: 'poll', entity_id: id },
      attributes: ['id', 'user_id', 'action', 'description', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true,
    });
  } catch (error) {
    console.error('[PollAdminService] audit history unavailable:', error.message);
  }

  const creator = userMap.get(tallied.created_by);
  return {
    poll: tallied,
    creator: creator ? { id: creator.id, name: nameOf(creator), image: creator.profile_image_url || null } : null,
    voters,
    voters_truncated: votes.length >= 500,
    history,
  };
}

// ---------------------------------------------------------------------------
// Input validation (whitelist)
// ---------------------------------------------------------------------------

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.&_-]{0,19}$/;

/**
 * Whitelists and validates admin poll input. Server-controlled fields
 * (created_by, vote counters, status, is_active, boost fields) are never read
 * from the body here.
 *   partial: true for edits — only the keys present are validated.
 */
function sanitisePollInput(body = {}, { partial = false, now = new Date() } = {}) {
  const errors = [];
  const data = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const want = (k) => !partial || has(k);

  if (want('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 3 || title.length > 200) errors.push('Title must be 3-200 characters');
    else { data.title = title; data.question = title; }
  }
  if (has('description')) {
    const d = body.description == null ? '' : String(body.description).trim();
    if (d.length > 2000) errors.push('Description must be at most 2000 characters');
    else data.description = d || null;
  }
  if (has('stock_symbol')) {
    const s = body.stock_symbol == null ? '' : String(body.stock_symbol).trim().toUpperCase();
    if (s && !SYMBOL_RE.test(s)) errors.push('Stock symbol may only contain letters, numbers and . & _ -');
    else data.stock_symbol = s || null;
  }
  if (want('poll_type')) {
    const t = body.poll_type || (partial ? undefined : 'buy_sell_hold');
    if (!POLL_TYPES.includes(t)) errors.push('Unknown poll type');
    else data.poll_type = t;
  }
  if (has('options') || (!partial && data.poll_type)) {
    let options = Array.isArray(body.options)
      ? body.options.map((o) => String(o?.label ?? o ?? '').trim()).filter(Boolean)
      : [];
    if (!options.length && data.poll_type && DEFAULT_OPTIONS[data.poll_type]) options = DEFAULT_OPTIONS[data.poll_type];
    const lower = options.map((o) => o.toLowerCase());
    if (options.length < 2 || options.length > 6) errors.push('A poll needs 2 to 6 options');
    else if (options.some((o) => o.length > 80)) errors.push('Options must be at most 80 characters');
    else if (new Set(lower).size !== lower.length) errors.push('Options must be unique');
    else data.options = options;
  }
  if (has('expires_at')) {
    if (body.expires_at === null || body.expires_at === '') data.expires_at = null;
    else {
      const d = toDate(body.expires_at);
      if (!d) errors.push('End time is not a valid date');
      else if (d <= now) errors.push('End time must be in the future');
      else data.expires_at = d;
    }
  }
  if (has('is_premium')) {
    if (typeof body.is_premium !== 'boolean') errors.push('is_premium must be true or false');
    else data.is_premium = body.is_premium;
  }
  if (has('target_price')) {
    if (body.target_price === null || body.target_price === '') data.target_price = null;
    else {
      const n = Number(body.target_price);
      if (!Number.isFinite(n) || n < 0 || n > 1e8) errors.push('Target price must be a positive number');
      else data.target_price = Math.round(n * 100) / 100;
    }
  }
  if (has('confidence_score')) {
    if (body.confidence_score === null || body.confidence_score === '') data.confidence_score = null;
    else {
      const n = Number(body.confidence_score);
      if (!Number.isInteger(n) || n < 1 || n > 5) errors.push('Confidence must be 1-5');
      else data.confidence_score = n;
    }
  }
  if (has('image_url')) {
    const u = body.image_url == null ? '' : String(body.image_url).trim();
    if (u && (!/^https:\/\/[^\s]+$/i.test(u) || u.length > 500)) errors.push('Image URL must be an https:// link');
    else data.image_url = u || null;
  }
  if (has('chat_room_id')) {
    const r = body.chat_room_id == null ? '' : String(body.chat_room_id).trim();
    if (r && !/^[0-9a-f-]{36}$/i.test(r)) errors.push('Chat room id is invalid');
    else data.chat_room_id = r || null;
  }
  return { data, errors };
}

/** Validated Tomorrow's Pick override (stored as JSON in platform_settings). */
function sanitiseTomorrowsPick(body = {}) {
  const errors = [];
  const active = body.active === true;
  const value = { active };
  const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max));
  if (active) {
    const symbol = str(body.stock_symbol, 20).toUpperCase();
    const reasoning = str(body.reasoning, 1000);
    if (!SYMBOL_RE.test(symbol)) errors.push('A valid stock symbol is required');
    if (reasoning.length < 10) errors.push('Reasoning must be at least 10 characters');
    const type = ['buy', 'sell', 'hold', 'watch'].includes(body.recommendation_type) ? body.recommendation_type : 'buy';
    const confidence = ['High', 'Medium', 'Low'].includes(body.confidence) ? body.confidence : 'High';
    let target = '';
    if (body.target_price !== undefined && body.target_price !== null && body.target_price !== '') {
      const n = Number(body.target_price);
      if (!Number.isFinite(n) || n < 0) errors.push('Target price must be a positive number');
      else target = n;
    }
    Object.assign(value, {
      title: str(body.title, 200) || `Tomorrow's Pick: ${symbol}`,
      stock_symbol: symbol,
      reasoning,
      target_price: target,
      recommendation_type: type,
      confidence,
    });
  }
  return { value, errors };
}

module.exports = {
  POLL_TYPES,
  DEFAULT_OPTIONS,
  pollStatus,
  isFeatured,
  isAdminPoll,
  decorate,
  rangeStart,
  bucketKey,
  parseListQuery,
  buildListWhere,
  listPolls,
  summary,
  computeAnalytics,
  analytics,
  details,
  sanitisePollInput,
  sanitiseTomorrowsPick,
};
