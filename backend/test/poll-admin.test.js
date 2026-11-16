const { test, beforeEach, afterEach, mock, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const PollAdmin = require('../src/services/PollAdminService');

// Super Admin > Poll Management: admin-only endpoints, whitelisted writes,
// audit trail, and analytics computed from PollVote rows.

const POLL_ID = 'bbbbbbbb-0000-4000-8000-0000000000b1';
const OTHER_ID = 'bbbbbbbb-0000-4000-8000-0000000000b2';
const SUB_ADMIN = { id: '44444444-4444-4444-8444-444444444444', email: 'sub@example.test', app_role: 'sub_admin', role: 'sub_admin', status: 'active' };
const NOW = new Date();
const future = (days) => new Date(NOW.getTime() + days * 86400000);
const past = (days) => new Date(NOW.getTime() - days * 86400000);

function pollRecord(overrides = {}) {
  const data = {
    id: POLL_ID,
    title: 'RELIANCE before results?',
    question: 'RELIANCE before results?',
    stock_symbol: 'RELIANCE',
    poll_type: 'buy_sell_hold',
    options: ['Buy', 'Sell', 'Hold'],
    status: 'active',
    is_active: true,
    is_premium: false,
    created_by: USERS.user.id,
    created_by_admin: false,
    expires_at: future(3),
    created_at: past(1),
    ...overrides,
  };
  const record = {
    ...data,
    toJSON: () => {
      const { toJSON, update, destroy, ...rest } = record;
      return { ...rest };
    },
    update: mock.fn(async (changes) => { Object.assign(record, changes); return record; }),
    destroy: mock.fn(async () => {}),
  };
  return record;
}

let audits;
let voteRowsByPoll;

beforeEach(() => {
  stubUserLookup({ [SUB_ADMIN.id]: SUB_ADMIN });
  audits = [];
  voteRowsByPoll = { [POLL_ID]: [{ option_index: 0, count: '2' }, { option_index: 2, count: '1' }] };
  mock.method(db.AuditLog, 'create', async (row) => { audits.push(row); return row; });
  mock.method(db.AuditLog, 'findAll', async () => []);
  // loadTallies: grouped queries.
  mock.method(db.PollVote, 'findAll', async (opts) => {
    if (opts.group && opts.group.includes('option_index')) {
      return Object.entries(voteRowsByPoll).flatMap(([poll_id, rows]) => rows.map((r) => ({ poll_id, ...r })));
    }
    if (opts.group) return Object.keys(voteRowsByPoll).map((poll_id) => ({ poll_id, voters: '3' }));
    return [];
  });
});
afterEach(() => mock.restoreAll());

const as = (req, user) => req.set('Authorization', bearer(user));

describe('authorisation', () => {
  const routes = [
    ['get', '/api/polls/admin/summary'],
    ['get', '/api/polls/admin/analytics'],
    ['get', '/api/polls/admin/polls'],
    ['post', '/api/polls/admin/polls'],
    ['get', `/api/polls/admin/polls/${POLL_ID}`],
    ['patch', `/api/polls/admin/polls/${POLL_ID}`],
    ['post', `/api/polls/admin/polls/${POLL_ID}/hide`],
    ['delete', `/api/polls/admin/polls/${POLL_ID}`],
    ['get', '/api/polls/admin/tomorrows-pick'],
    ['put', '/api/polls/admin/tomorrows-pick'],
  ];

  for (const [method, url] of routes) {
    test(`${method.toUpperCase()} ${url} needs a token`, async () => {
      assert.equal((await request(app)[method](url)).status, 401);
    });
    test(`${method.toUpperCase()} ${url} refuses a regular member`, async () => {
      const res = await as(request(app)[method](url), USERS.user);
      assert.equal(res.status, 403);
    });
  }
});

describe('list and summary', () => {
  test('lists polls with reconciled counts, status and pagination', async () => {
    let seen;
    mock.method(db.Poll, 'findAndCountAll', async (opts) => {
      seen = opts;
      return { rows: [pollRecord({ total_votes: 40 })], count: 41 };
    });
    const res = await as(request(app).get('/api/polls/admin/polls?limit=1000&page=2&status=hidden&search=50%25'), USERS.admin);
    assert.equal(res.status, 200);
    assert.equal(seen.limit, 100, 'page size is capped');
    assert.equal(seen.offset, 100);
    const [item] = res.body.items;
    assert.equal(item.total_votes, 3, 'counts come from PollVote rows, not the stored counter');
    assert.deepEqual(item.vote_counts, [2, 0, 1]);
    assert.equal(item.admin_status, 'active');
    assert.equal(res.body.total, 41);
    assert.equal(res.body.pages, 1);
  });

  test('summary counts statuses with the same rules as the list', async () => {
    mock.method(db.Poll, 'findAll', async () => [
      { id: POLL_ID, options: ['Buy', 'Sell'], status: 'active', is_active: true, is_premium: true, created_by_admin: true },
      { id: OTHER_ID, options: ['Yes', 'No'], status: 'active', is_active: false },
      { id: 'c3', status: 'closed', is_active: true },
      { id: 'c4', status: 'active', is_active: true, expires_at: past(1), is_boosted: true, boost_expires_at: future(1) },
    ]);
    mock.method(db.PollVote, 'count', async () => 3);
    const res = await as(request(app).get('/api/polls/admin/summary'), USERS.superAdmin);
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 4);
    assert.equal(res.body.active, 1);
    assert.equal(res.body.hidden, 1);
    assert.equal(res.body.closed, 2);
    assert.equal(res.body.featured, 1);
    assert.equal(res.body.premium, 1);
    assert.equal(res.body.admin, 1);
    assert.equal(res.body.total_votes, 3);
    assert.equal(res.body.unique_voters, 3);
  });
});

describe('buildListWhere', () => {
  const { Op } = db.Sequelize;
  const flat = (where) => JSON.stringify(where, (k, v) => v, 0);
  test('hidden means is_active = false', () => {
    const w = PollAdmin.buildListWhere({ status: 'hidden', type: 'all', range: 'all' }, NOW);
    assert.deepEqual(w[Op.and], [{ is_active: false }]);
  });
  test('search escapes LIKE wildcards', () => {
    const w = PollAdmin.buildListWhere({ search: '50%_off', status: 'all', type: 'all', range: 'all' }, NOW);
    const like = w[Op.and][0][Op.or][0].title[Op.like];
    assert.equal(like, '%50\\%\\_off%');
  });
  test('a time range filters on created_at', () => {
    const w = PollAdmin.buildListWhere({ status: 'all', type: 'all', range: '7d', tzOffset: 0 }, NOW);
    const since = w[Op.and][0].created_at[Op.gte];
    assert.ok(since instanceof Date && since < NOW && NOW - since <= 7 * 86400000);
    assert.ok(flat(w));
  });
  test('no filters means no WHERE clause', () => {
    assert.deepEqual(PollAdmin.buildListWhere({ status: 'all', type: 'all', range: 'all' }, NOW), {});
  });
});

describe('create', () => {
  test('whitelists the body and stamps server-controlled fields', async () => {
    let created;
    mock.method(db.Poll, 'findOne', async () => null);
    mock.method(db.Poll, 'create', async (data) => { created = data; return pollRecord({ ...data, id: POLL_ID }); });
    voteRowsByPoll = {};
    const res = await as(request(app).post('/api/polls/admin/polls'), USERS.admin).send({
      title: 'TCS after Q3?',
      stock_symbol: 'tcs',
      poll_type: 'sentiment',
      is_premium: true,
      expires_at: future(2).toISOString(),
      // Must be ignored:
      created_by: USERS.user.id,
      total_votes: 999,
      is_active: false,
      votes: { 0: 50 },
      is_boosted: true,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(created.created_by, USERS.admin.id);
    assert.equal(created.total_votes, 0);
    assert.deepEqual(created.votes, {});
    assert.equal(created.is_active, true);
    assert.equal(created.created_by_admin, true);
    assert.equal(created.is_boosted, undefined);
    assert.equal(created.stock_symbol, 'TCS');
    assert.deepEqual(created.options, ['Bullish', 'Bearish', 'Neutral'], 'default options for the type');
    assert.equal(audits[0].action, 'poll_created');
    assert.equal(audits[0].user_id, USERS.admin.id);
  });

  test('rejects invalid input with 400', async () => {
    const res = await as(request(app).post('/api/polls/admin/polls'), USERS.admin)
      .send({ title: 'x', options: ['Only one'], poll_type: 'custom', expires_at: past(1).toISOString() });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length >= 2);
  });

  test('refuses a second active poll for the same stock', async () => {
    mock.method(db.Poll, 'findOne', async () => pollRecord());
    const res = await as(request(app).post('/api/polls/admin/polls'), USERS.admin)
      .send({ title: 'RELIANCE again?', stock_symbol: 'RELIANCE' });
    assert.equal(res.status, 409);
  });
});

describe('edit and moderation', () => {
  let poll;
  beforeEach(() => {
    poll = pollRecord();
    mock.method(db.Poll, 'findByPk', async (id) => (id === POLL_ID ? poll : null));
  });

  test('edits whitelisted fields and audits the diff', async () => {
    const res = await as(request(app).patch(`/api/polls/admin/polls/${POLL_ID}`), USERS.admin)
      .send({ title: 'RELIANCE after results?', is_premium: true, total_votes: 5000, created_by: USERS.admin.id });
    assert.equal(res.status, 200);
    const changes = poll.update.mock.calls[0].arguments[0];
    assert.equal(changes.title, 'RELIANCE after results?');
    assert.equal(changes.is_premium, true);
    assert.equal(changes.total_votes, undefined);
    assert.equal(changes.created_by, undefined);
    assert.equal(audits[0].action, 'poll_updated');
    assert.equal(audits[0].old_data.is_premium, false);
    assert.equal(audits[0].new_data.is_premium, true);
  });

  test('options cannot change once votes exist', async () => {
    const res = await as(request(app).patch(`/api/polls/admin/polls/${POLL_ID}`), USERS.admin)
      .send({ options: ['Sell', 'Buy', 'Hold'] });
    assert.equal(res.status, 409);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test('hiding needs a reason, and records it', async () => {
    let res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/hide`), USERS.admin).send({});
    assert.equal(res.status, 400);
    res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/hide`), USERS.admin).send({ reason: 'Pump and dump spam' });
    assert.equal(res.status, 200);
    assert.equal(poll.is_active, false);
    assert.equal(res.body.admin_status, 'hidden');
    assert.equal(audits[0].action, 'poll_hidden');
    assert.match(audits[0].description, /Pump and dump spam/);
  });

  test('close and reopen', async () => {
    let res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/close`), USERS.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.admin_status, 'closed');
    res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/reopen`), USERS.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.admin_status, 'active');
    assert.deepEqual(audits.map((a) => a.action), ['poll_closed', 'poll_reopened']);
  });

  test('reopening an ended poll needs a new end time', async () => {
    poll = pollRecord({ expires_at: past(1) });
    let res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/reopen`), USERS.admin);
    assert.equal(res.status, 400);
    res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/reopen`), USERS.admin).send({ expires_at: future(5).toISOString() });
    assert.equal(res.status, 200);
    assert.equal(res.body.admin_status, 'active');
  });

  test('feature validates the duration and unfeature clears it', async () => {
    let res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/feature`), USERS.admin).send({ days: 90 });
    assert.equal(res.status, 400);
    res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/feature`), USERS.admin).send({ days: 7 });
    assert.equal(res.status, 200);
    assert.equal(res.body.is_featured, true);
    assert.ok(new Date(poll.boost_expires_at) <= new Date(poll.expires_at), 'never featured past the poll end');
    res = await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/unfeature`), USERS.admin);
    assert.equal(res.body.is_featured, false);
  });

  test('unknown action and bad id', async () => {
    assert.equal((await as(request(app).post(`/api/polls/admin/polls/${POLL_ID}/explode`), USERS.admin)).status, 404);
    assert.equal((await as(request(app).post('/api/polls/admin/polls/not-a-uuid/close'), USERS.admin)).status, 400);
    assert.equal((await as(request(app).post(`/api/polls/admin/polls/${OTHER_ID}/close`), USERS.admin)).status, 404);
  });

  test('delete removes the poll and its votes in one transaction and audits a snapshot', async () => {
    const tx = { commit: mock.fn(async () => {}), rollback: mock.fn(async () => {}) };
    mock.method(db.sequelize, 'transaction', async () => tx);
    const destroyVotes = mock.method(db.PollVote, 'destroy', async () => 3);
    const res = await as(request(app).delete(`/api/polls/admin/polls/${POLL_ID}`), USERS.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted_votes, 3);
    assert.equal(destroyVotes.mock.calls[0].arguments[0].transaction, tx);
    assert.equal(poll.destroy.mock.calls[0].arguments[0].transaction, tx);
    assert.equal(tx.commit.mock.callCount(), 1);
    assert.equal(audits[0].action, 'poll_deleted');
    assert.equal(audits[0].old_data.total_votes, 3);
  });

  test('details returns per-option counts, voters and history', async () => {
    db.PollVote.findAll.mock.mockImplementation(async (opts) => {
      if (opts.group && opts.group.includes('option_index')) return [{ poll_id: POLL_ID, option_index: 0, count: '1' }];
      if (opts.group) return [{ poll_id: POLL_ID, voters: '1' }];
      return [{ id: 'v1', user_id: USERS.user.id, option_index: 0, voted_at: NOW }];
    });
    mock.method(db.User, 'findAll', async () => [{ id: USERS.user.id, display_name: 'Asha' }]);
    const res = await as(request(app).get(`/api/polls/admin/polls/${POLL_ID}`), USERS.admin);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.poll.vote_counts, [1, 0, 0]);
    assert.equal(res.body.poll.unique_voters, 1);
    assert.equal(res.body.voters[0].option_label, 'Buy');
    assert.equal(res.body.voters[0].user.name, 'Asha');
    assert.equal(res.body.creator.name, 'Asha');
  });
});

describe("Tomorrow's Pick override", () => {
  test('validates and stores the override, with an audit entry', async () => {
    mock.method(db.PlatformSetting, 'findOne', async () => null);
    let stored;
    mock.method(db.PlatformSetting, 'create', async (row) => { stored = row; return row; });
    let res = await as(request(app).put('/api/polls/admin/tomorrows-pick'), USERS.admin).send({ active: true, stock_symbol: '' });
    assert.equal(res.status, 400);
    res = await as(request(app).put('/api/polls/admin/tomorrows-pick'), USERS.admin)
      .send({ active: true, stock_symbol: 'infy', reasoning: 'Strong deal pipeline into results', recommendation_type: 'buy', confidence: 'High', target_price: '1900', evil: 'x' });
    assert.equal(res.status, 200);
    const value = JSON.parse(stored.value);
    assert.equal(stored.key, 'tomorrows_pick_override');
    assert.equal(value.stock_symbol, 'INFY');
    assert.equal(value.active, true);
    assert.equal(value.evil, undefined);
    assert.equal(audits[0].action, 'tomorrows_pick_updated');
  });

  test('turning the override off keeps only active:false', async () => {
    const row = { value: JSON.stringify({ active: true, stock_symbol: 'INFY' }), update: mock.fn(async () => {}) };
    mock.method(db.PlatformSetting, 'findOne', async () => row);
    const res = await as(request(app).put('/api/polls/admin/tomorrows-pick'), USERS.superAdmin).send({ active: false, stock_symbol: 'INFY' });
    assert.equal(res.status, 200);
    const value = JSON.parse(row.update.mock.calls[0].arguments[0].value);
    assert.equal(value.active, false);
    assert.equal(value.stock_symbol, undefined);
  });
});

describe('analytics', () => {
  const polls = [
    { id: 'p1', title: 'A', stock_symbol: 'TCS', poll_type: 'buy_sell_hold', options: ['Buy', 'Sell', 'Hold'], is_premium: true, created_by_admin: true, status: 'active', is_active: true, created_at: past(40) },
    { id: 'p2', title: 'B', stock_symbol: 'INFY', poll_type: 'sentiment', options: ['Bullish', 'Bearish', 'Neutral'], is_premium: false, status: 'active', is_active: true, created_at: past(2) },
    { id: 'p3', title: 'C', stock_symbol: 'TCS', poll_type: 'yes_no', options: ['Yes', 'No'], status: 'closed', is_active: true, created_at: past(60) },
  ];
  const voteRows = [
    { poll_id: 'p1', user_id: 'u1', option_index: 0, voted_at: past(1) },
    { poll_id: 'p1', user_id: 'u2', option_index: 0, voted_at: past(3) },
    { poll_id: 'p2', user_id: 'u1', option_index: 1, voted_at: past(1) },
    { poll_id: 'p3', user_id: 'u3', option_index: 0, voted_at: past(50) }, // outside 30d
    { poll_id: 'gone', user_id: 'u4', option_index: 0, voted_at: past(1) }, // deleted poll
    { poll_id: 'p2', user_id: 'u5', option_index: 2, voted_at: null, created_at: past(1) }, // legacy row
  ];

  test('participation, turnout and engagement follow the documented definitions', () => {
    const a = PollAdmin.computeAnalytics({ polls, voteRows, registeredUsers: 10, range: '30d', now: NOW });
    assert.equal(a.participation.total_votes, 4);
    assert.equal(a.participation.unique_voters, 3);
    assert.equal(a.participation.turnout_pct, 30);
    // p1 (older, but voted on in range) + p2 (created in range); p3 out of scope.
    assert.equal(a.participation.polls_in_scope, 2);
    assert.equal(a.participation.avg_votes_per_poll, 2);
    assert.equal(a.participation.votes_per_voter, 1.3);
    assert.equal(a.segments.premium.votes, 2);
    assert.equal(a.segments.general.votes, 2);
    assert.equal(a.segments.admin.polls, 1);
    const p1 = a.polls.find((p) => p.id === 'p1');
    assert.deepEqual(p1.vote_counts, [2, 0, 0]);
    assert.equal(a.top_stocks[0].symbol, 'TCS');
    assert.equal(a.bucket, 'day');
    assert.equal(a.activity.length, 30);
    assert.equal(a.activity.reduce((s, b) => s + b.votes, 0), 4, 'activity adds up to the total');
    assert.equal(a.activity.reduce((s, b) => s + b.new_polls, 0), 1);
  });

  test('all-time includes every poll and vote except orphans', () => {
    const a = PollAdmin.computeAnalytics({ polls, voteRows, registeredUsers: 0, range: 'all', now: NOW });
    assert.equal(a.participation.total_votes, 5);
    assert.equal(a.participation.polls_in_scope, 3);
    assert.equal(a.participation.turnout_pct, null);
    assert.equal(a.status_counts.closed, 1);
  });

  test('the endpoint really filters votes by the range', async () => {
    let voteQuery;
    mock.method(db.Poll, 'findAll', async () => polls);
    db.PollVote.findAll.mock.mockImplementation(async (opts) => { voteQuery = opts; return voteRows; });
    mock.method(db.User, 'count', async () => 10);
    const res = await as(request(app).get('/api/polls/admin/analytics?range=7d&tz=-330'), USERS.admin);
    assert.equal(res.status, 200);
    const { Op } = db.Sequelize;
    const since = voteQuery.where[Op.or][0].voted_at[Op.gte];
    assert.ok(since instanceof Date);
    assert.ok(NOW - since <= 7 * 86400000);
    assert.equal(res.body.range, '7d');
    assert.equal(res.body.activity.length, 7);
  });
});

describe('member-facing guards', () => {
  test('a hidden poll cannot be voted on', async () => {
    mock.method(db.sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} }));
    mock.method(db.Poll, 'findByPk', async () => pollRecord({ is_active: false }));
    const res = await as(request(app).post('/api/polls/votes/cast'), USERS.user).send({ poll_id: POLL_ID, option_index: 0 });
    assert.equal(res.status, 403);
  });

  test('a closed poll cannot be voted on', async () => {
    mock.method(db.sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} }));
    mock.method(db.Poll, 'findByPk', async () => pollRecord({ status: 'closed' }));
    const res = await as(request(app).post('/api/polls/votes/cast'), USERS.user).send({ poll_id: POLL_ID, option_index: 0 });
    assert.equal(res.status, 403);
  });

  test("a member cannot edit someone else's poll", async () => {
    const poll = pollRecord({ created_by: USERS.admin.id });
    mock.method(db.Poll, 'findByPk', async () => poll);
    const res = await as(request(app).put(`/api/polls/${POLL_ID}`), USERS.user).send({ title: 'mine now' });
    assert.equal(res.status, 404);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test("a member cannot delete someone else's poll", async () => {
    const poll = pollRecord({ created_by: USERS.admin.id });
    mock.method(db.Poll, 'findByPk', async () => poll);
    const res = await as(request(app).delete(`/api/polls/${POLL_ID}`), USERS.user);
    assert.equal(res.status, 404);
    assert.equal(poll.destroy.mock.callCount(), 0);
  });

  test('a creator cannot un-hide their own poll or rewrite counters', async () => {
    const poll = pollRecord({ is_active: false });
    mock.method(db.Poll, 'findByPk', async () => poll);
    const res = await as(request(app).put(`/api/polls/${POLL_ID}`), USERS.user)
      .send({ description: 'updated', is_active: true, total_votes: 500, created_by_admin: true });
    assert.equal(res.status, 200);
    const changes = poll.update.mock.calls[0].arguments[0];
    assert.equal(changes.description, 'updated');
    assert.equal(changes.is_active, undefined);
    assert.equal(changes.total_votes, undefined);
    assert.equal(changes.created_by_admin, undefined);
  });

  test('hidden polls are left out of the public active list', async () => {
    let where;
    mock.method(db.Poll, 'findAll', async (opts) => { where = opts.where; return []; });
    const res = await request(app).get('/api/polls/active');
    assert.equal(res.status, 200);
    const { Op } = db.Sequelize;
    assert.deepEqual(where[Op.and][0][Op.or], [{ is_active: true }, { is_active: null }]);
  });
});

describe('generic PUT / DELETE /api/polls/:id (M-3)', () => {
  let poll;
  const tx = () => ({ commit: mock.fn(async () => {}), rollback: mock.fn(async () => {}) });
  beforeEach(() => {
    poll = pollRecord(); // owned by USERS.user, has 3 votes
    mock.method(db.Poll, 'findByPk', async (id) => (id === POLL_ID ? poll : null));
  });
  const put = (user, body) => as(request(app).put(`/api/polls/${POLL_ID}`), user).send(body);

  test('owner cannot re-label options once votes exist', async () => {
    const res = await put(USERS.user, { options: ['Sell', 'Buy', 'Hold'] });
    assert.equal(res.status, 409);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test('owner cannot change poll_type once votes exist', async () => {
    const res = await put(USERS.user, { poll_type: 'yes_no', options: ['Yes', 'No'] });
    assert.equal(res.status, 409);
  });

  test('owner may change options before any votes', async () => {
    voteRowsByPoll = {};
    const res = await put(USERS.user, { options: ['Up', 'Down'] });
    assert.equal(res.status, 200);
    assert.deepEqual(poll.update.mock.calls[0].arguments[0].options, ['Up', 'Down']);
  });

  test('owner edits are limited to the allow-list', async () => {
    poll = pollRecord({ status: 'closed', is_premium: false });
    const res = await put(USERS.user, {
      title: 'Better title', description: 'More context', image_url: 'https://img.example.test/a.png',
      status: 'active', is_premium: true, expires_at: future(30).toISOString(), chat_room_id: OTHER_ID,
      is_active: true, total_votes: 99, created_by_admin: true, boosted_by: USERS.admin.id,
    });
    assert.equal(res.status, 200);
    const changes = poll.update.mock.calls[0].arguments[0];
    assert.equal(changes.title, 'Better title');
    assert.equal(changes.description, 'More context');
    assert.equal(changes.image_url, 'https://img.example.test/a.png');
    for (const k of ['status', 'is_premium', 'expires_at', 'chat_room_id', 'is_active', 'total_votes', 'created_by_admin', 'boosted_by']) {
      assert.equal(changes[k], undefined, `${k} must be ignored`);
    }
  });

  test('a body with only forbidden fields changes nothing', async () => {
    poll = pollRecord({ status: 'closed' });
    const res = await put(USERS.user, { status: 'active', is_premium: true });
    assert.equal(res.status, 400);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test('owner boost is server-capped to 24 hours, whatever is sent', async () => {
    const res = await put(USERS.user, { is_boosted: true, boost_expires_at: '2099-01-01T00:00:00Z', boosted_by: USERS.admin.id });
    assert.equal(res.status, 200);
    const changes = poll.update.mock.calls[0].arguments[0];
    assert.equal(changes.is_boosted, true);
    assert.equal(changes.boosted_by, USERS.user.id);
    assert.ok(new Date(changes.boost_expires_at) - Date.now() <= 24 * 3600000 + 1000);
  });

  test('owner cannot boost a closed or hidden poll', async () => {
    poll = pollRecord({ status: 'closed' });
    assert.equal((await put(USERS.user, { is_boosted: true })).status, 400);
    poll = pollRecord({ is_active: false });
    assert.equal((await put(USERS.user, { is_boosted: true })).status, 400);
  });

  test('sub_admin is not staff for polls: cannot unhide or edit someone else\'s poll', async () => {
    poll = pollRecord({ is_active: false });
    const res = await put(SUB_ADMIN, { is_active: true, votes: { 0: 99 }, created_by_admin: true });
    assert.equal(res.status, 404);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test('sub_admin cannot delete someone else\'s poll', async () => {
    const res = await as(request(app).delete(`/api/polls/${POLL_ID}`), SUB_ADMIN);
    assert.equal(res.status, 404);
    assert.equal(poll.destroy.mock.callCount(), 0);
  });

  test('admin generic edits get the options lock', async () => {
    const res = await put(USERS.admin, { options: ['Sell', 'Buy', 'Hold'] });
    assert.equal(res.status, 409);
    assert.equal(poll.update.mock.callCount(), 0);
  });

  test('admin generic moderation flags are validated and audited', async () => {
    poll = pollRecord({ is_active: false });
    const res = await put(USERS.admin, { is_active: true, total_votes: 500, created_by_admin: true, is_boosted: true, boost_expires_at: '2099-01-01T00:00:00Z' });
    assert.equal(res.status, 200);
    const changes = poll.update.mock.calls[0].arguments[0];
    assert.equal(changes.is_active, true);
    assert.equal(changes.total_votes, undefined);
    assert.equal(changes.created_by_admin, undefined);
    assert.equal(changes.boosted_by, USERS.admin.id);
    assert.ok(new Date(changes.boost_expires_at) <= new Date(poll.expires_at), 'boost capped at the poll end');
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, 'poll_updated');
    assert.equal(audits[0].old_data.is_active, false);
    assert.equal(audits[0].new_data.is_active, true);
  });

  test('admin generic edit rejects an invalid status', async () => {
    const res = await put(USERS.admin, { status: 'deleted' });
    assert.equal(res.status, 400);
  });

  test('owner delete removes the votes in the same transaction', async () => {
    const t = tx();
    mock.method(db.sequelize, 'transaction', async () => t);
    const destroyVotes = mock.method(db.PollVote, 'destroy', async () => 3);
    const res = await as(request(app).delete(`/api/polls/${POLL_ID}`), USERS.user);
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted_votes, 3);
    assert.deepEqual(destroyVotes.mock.calls[0].arguments[0].where, { poll_id: POLL_ID });
    assert.equal(destroyVotes.mock.calls[0].arguments[0].transaction, t);
    assert.equal(poll.destroy.mock.calls[0].arguments[0].transaction, t);
    assert.equal(t.commit.mock.callCount(), 1);
    assert.equal(audits[0].action, 'poll_deleted_by_owner');
  });

  test('a failed delete rolls back', async () => {
    const t = tx();
    mock.method(db.sequelize, 'transaction', async () => t);
    mock.method(db.PollVote, 'destroy', async () => 3);
    poll.destroy = mock.fn(async () => { throw new Error('boom'); });
    const res = await as(request(app).delete(`/api/polls/${POLL_ID}`), USERS.user);
    assert.equal(res.status, 500);
    assert.equal(t.rollback.mock.callCount(), 1);
    assert.equal(t.commit.mock.callCount(), 0);
  });

  for (const method of ['post', 'put', 'delete']) {
    test(`${method.toUpperCase()} /api/polls/bulk is closed, even for admins`, async () => {
      const res = await as(request(app)[method]('/api/polls/bulk'), USERS.superAdmin).send({ ids: [POLL_ID], data: { is_active: true } });
      assert.equal(res.status, 405);
    });
  }

  test('generic create: server-controlled fields for non-admins, including sub_admin', async () => {
    let created;
    mock.method(db.Poll, 'findOne', async () => null);
    mock.method(db.Poll, 'create', async (data) => { created = data; return pollRecord({ ...data }); });
    const res = await as(request(app).post('/api/polls'), SUB_ADMIN).send({
      title: 'Sub admin poll', options: ['A', 'B'], status: 'closed', is_active: false,
      created_by_admin: true, is_boosted: true, boost_expires_at: '2099-01-01T00:00:00Z', total_votes: 50, votes: { 0: 50 },
    });
    assert.equal(res.status, 201);
    assert.equal(created.created_by, SUB_ADMIN.id);
    assert.equal(created.created_by_admin, undefined);
    assert.equal(created.is_boosted, undefined);
    assert.equal(created.boost_expires_at, undefined);
    assert.equal(created.status, 'active');
    assert.equal(created.is_active, true);
    assert.equal(created.total_votes, 0);
    assert.deepEqual(created.votes, {});
  });
});
