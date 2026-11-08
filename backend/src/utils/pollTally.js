/**
 * Poll vote tallies.
 *
 * The poll row carries denormalised counters (`votes`, `total_votes`,
 * `buy_votes` ...) that drift from reality: the cast endpoint only maintains
 * `votes` and `total_votes`, and seeded or legacy rows disagree with both. The
 * PollVote rows are the record of who voted for what, so they are the source of
 * truth. Every poll read is reconciled against them here, which means the
 * numbers a client shows always add up.
 *
 * Added to each poll payload:
 *   vote_counts   number[]  votes per option, aligned with `options`
 *   votes         { [optionIndex]: count }  (overwritten with the reconciled map)
 *   total_votes   number    sum of vote_counts
 *   unique_voters number    distinct users who voted
 */
const db = require('../models');

const asInt = (v) => Number.parseInt(v, 10) || 0;

/** Loads { pollId -> { byOption: {idx: n}, voters } } from PollVote rows. */
async function loadTallies(pollIds, options = {}) {
  const ids = [...new Set((pollIds || []).filter(Boolean))];
  const tallies = new Map(ids.map((id) => [id, { byOption: {}, voters: 0 }]));
  if (ids.length === 0) return tallies;

  const { Op, fn, col } = db.Sequelize;
  const where = { poll_id: { [Op.in]: ids } };
  const [perOption, perPoll] = await Promise.all([
    db.PollVote.findAll({
      where,
      attributes: ['poll_id', 'option_index', [fn('COUNT', col('id')), 'count']],
      group: ['poll_id', 'option_index'],
      raw: true,
      ...options,
    }),
    db.PollVote.findAll({
      where,
      attributes: ['poll_id', [fn('COUNT', fn('DISTINCT', col('user_id'))), 'voters']],
      group: ['poll_id'],
      raw: true,
      ...options,
    }),
  ]);

  for (const row of perOption || []) {
    const t = tallies.get(row.poll_id);
    if (t) t.byOption[asInt(row.option_index)] = asInt(row.count);
  }
  for (const row of perPoll || []) {
    const t = tallies.get(row.poll_id);
    if (t) t.voters = asInt(row.voters);
  }
  return tallies;
}

/** Returns a plain copy of `poll` with the reconciled tally fields applied. */
function applyTally(poll, tally) {
  const plain = typeof poll?.toJSON === 'function' ? poll.toJSON() : { ...poll };
  const byOption = tally?.byOption || {};
  const optionCount = Array.isArray(plain.options) ? plain.options.length : 0;
  const highest = Object.keys(byOption).reduce((m, k) => Math.max(m, Number(k) + 1), 0);
  const length = Math.max(optionCount, highest);

  const counts = Array.from({ length }, (_, i) => byOption[i] || 0);
  plain.vote_counts = counts;
  plain.votes = Object.fromEntries(counts.map((n, i) => [i, n]));
  plain.total_votes = counts.reduce((a, b) => a + b, 0);
  plain.unique_voters = tally?.voters || 0;
  return plain;
}

/** Reconciles one poll or an array of polls. */
async function withTallies(body, options) {
  const list = Array.isArray(body);
  const polls = (list ? body : [body]).filter(Boolean);
  const tallies = await loadTallies(polls.map((p) => p.id), options);
  const out = polls.map((p) => applyTally(p, tallies.get(p.id)));
  return list ? out : out[0];
}

/**
 * Express middleware: reconciles the JSON body of a successful GET before it
 * is sent. Other methods, error responses and non-poll bodies pass through, so
 * it is safe to put in a CRUD middleware chain.
 */
function reconcileTalliesOnGet(req, res, next) {
  if (req.method !== 'GET') return next();
  const send = res.json.bind(res);
  res.json = (body) => {
    const looksLikePoll = (b) => b && typeof b === 'object' && ('options' in b || typeof b.toJSON === 'function');
    const isPollBody = Array.isArray(body) ? body.every(looksLikePoll) : looksLikePoll(body);
    if (res.statusCode >= 400 || !body || !isPollBody) return send(body);
    return withTallies(body)
      .then(send)
      .catch((error) => {
        console.error('[pollTally] reconcile failed:', error);
        res.status(500);
        return send({ error: 'Internal server error' });
      });
  };
  return next();
}

module.exports = { loadTallies, applyTally, withTallies, reconcileTalliesOnGet };
