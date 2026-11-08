const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app, db, USERS, bearer, stubUserLookup } = require('./helpers');
const { applyTally } = require('../src/utils/pollTally');

// Poll counters (votes / total_votes / *_votes) drift from the PollVote rows.
// Reads are reconciled against the rows, so option counts and the total add up.

const POLL_ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const tcsRow = () => {
  const row = {
    id: POLL_ID, title: 'TCS Q3?', stock_symbol: 'TCS', options: ['Buy', 'Sell', 'Hold'],
    // Drifted counters: claims 9 votes, the options only account for 4.
    votes: { 0: 3, 2: 1 }, total_votes: 9, buy_votes: 0, sell_votes: 0, hold_votes: 0,
    is_active: true, status: 'active',
  };
  return { ...row, toJSON: () => ({ ...row }) };
};

beforeEach(() => {
  stubUserLookup();
  // 3 Buy + 1 Hold by 4 distinct users.
  mock.method(db.PollVote, 'findAll', async (opts) => {
    const groupedByOption = opts.group.includes('option_index');
    return groupedByOption
      ? [{ poll_id: POLL_ID, option_index: 0, count: '3' }, { poll_id: POLL_ID, option_index: 2, count: '1' }]
      : [{ poll_id: POLL_ID, voters: '4' }];
  });
  mock.method(db.Poll, 'findAll', async () => [tcsRow()]);
  mock.method(db.Poll, 'findByPk', async (id) => (id === POLL_ID ? tcsRow() : null));
});
afterEach(() => mock.restoreAll());

test('GET /api/polls requires authentication', async () => {
  assert.equal((await request(app).get('/api/polls')).status, 401);
});

test('GET /api/polls reports counts from PollVote rows, not drifted counters', async () => {
  const res = await request(app).get('/api/polls').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  const [poll] = res.body;
  assert.deepEqual(poll.vote_counts, [3, 0, 1]);
  assert.deepEqual(poll.votes, { 0: 3, 1: 0, 2: 1 });
  assert.equal(poll.total_votes, 4);
  assert.equal(poll.unique_voters, 4);
  assert.equal(poll.vote_counts.reduce((a, b) => a + b, 0), poll.total_votes);
});

test('GET /api/polls/:id is reconciled the same way', async () => {
  const res = await request(app).get(`/api/polls/${POLL_ID}`).set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
  assert.equal(res.body.total_votes, 4);
  assert.deepEqual(res.body.vote_counts, [3, 0, 1]);
});

test('an unknown poll is still a 404 (the tally layer does not mask errors)', async () => {
  const res = await request(app).get('/api/polls/aaaaaaaa-0000-4000-8000-0000000000ff').set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 404);
});

test('the public active-polls list is reconciled too', async () => {
  const res = await request(app).get('/api/polls/active');
  assert.equal(res.status, 200);
  assert.equal(res.body[0].total_votes, 4);
});

test('applyTally: no votes gives zeros for every option', () => {
  const out = applyTally({ options: ['Yes', 'No'], total_votes: 7, votes: { 0: 7 } }, { byOption: {}, voters: 0 });
  assert.deepEqual(out.vote_counts, [0, 0]);
  assert.equal(out.total_votes, 0);
  assert.equal(out.unique_voters, 0);
});

test('applyTally: a vote on an option outside the declared list still counts', () => {
  const out = applyTally({ options: ['Yes'] }, { byOption: { 2: 5 }, voters: 5 });
  assert.deepEqual(out.vote_counts, [0, 0, 5]);
  assert.equal(out.total_votes, 5);
});
