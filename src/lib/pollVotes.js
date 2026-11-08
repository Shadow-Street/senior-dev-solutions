/**
 * Single place that turns a poll record into vote numbers.
 *
 * A poll row carries the same votes in several shapes that drift apart:
 *   vote_counts   per-option array, reconciled by the API from PollVote rows
 *                 (the source of truth - see backend/src/utils/pollTally.js)
 *   votes         { [optionIndex]: count } map maintained by the cast endpoint
 *   *_votes       legacy named counters (buy_votes, bullish_votes ...), which
 *                 the cast endpoint never updates
 *   total_votes   a separate counter that can disagree with all of the above
 *
 * Reading them in different components is how one card showed "9 votes" next
 * to options adding up to 4, and another showed 0% for a poll with a vote.
 * Here the options are resolved once, in the order above, and `total` is
 * always the sum of the option counts, so the numbers cannot disagree.
 */

const DEFAULT_OPTIONS = {
  sentiment: ['Bullish', 'Bearish', 'Neutral'],
  yes_no: ['Yes', 'No'],
  buy_sell_hold: ['Buy', 'Sell', 'Hold'],
};

// Legacy counter column for each option label.
const LEGACY_FIELD = {
  buy: 'buy_votes', sell: 'sell_votes', hold: 'hold_votes',
  bullish: 'bullish_votes', bearish: 'bearish_votes', neutral: 'neutral_votes',
  yes: 'yes_votes', no: 'no_votes',
};

const POSITIVE = new Set(['buy', 'bullish', 'yes']);
const NEGATIVE = new Set(['sell', 'bearish', 'no']);
const NEUTRAL = new Set(['hold', 'neutral']);

const toCount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** 'positive' | 'negative' | 'neutral' | 'other' - drives colour and icon. */
export function optionTone(label) {
  const key = String(label ?? '').trim().toLowerCase();
  if (POSITIVE.has(key)) return 'positive';
  if (NEGATIVE.has(key)) return 'negative';
  if (NEUTRAL.has(key)) return 'neutral';
  return 'other';
}

function defaultOptions(poll) {
  const type = String(poll?.poll_type ?? '').toLowerCase();
  if (type === 'sentiment') return DEFAULT_OPTIONS.sentiment;
  if (type === 'price_target' || type === 'yes_no') return DEFAULT_OPTIONS.yes_no;
  // A poll with no options array but sentiment counters is a sentiment poll.
  const sentimentVotes = toCount(poll?.bullish_votes) + toCount(poll?.bearish_votes) + toCount(poll?.neutral_votes);
  const tradeVotes = toCount(poll?.buy_votes) + toCount(poll?.sell_votes) + toCount(poll?.hold_votes);
  if (sentimentVotes > 0 && tradeVotes === 0) return DEFAULT_OPTIONS.sentiment;
  return DEFAULT_OPTIONS.buy_sell_hold;
}

/** Option labels, in the order the cast endpoint indexes them. */
function resolveOptions(poll) {
  const declared = Array.isArray(poll?.options) ? poll.options.map((o) => String(o?.label ?? o)) : [];
  return declared.length > 0 ? declared : defaultOptions(poll);
}

function resolveCounts(poll, labels) {
  if (Array.isArray(poll?.vote_counts)) return labels.map((_, i) => toCount(poll.vote_counts[i]));

  const map = poll?.votes;
  if (map && typeof map === 'object' && Object.values(map).some((n) => toCount(n) > 0)) {
    return labels.map((_, i) => toCount(map[i]));
  }

  return labels.map((label) => toCount(poll?.[LEGACY_FIELD[label.trim().toLowerCase()]]));
}

/**
 * Integer percentages that add up to exactly 100 (largest remainder), so a card
 * never shows 33% + 33% + 33%.
 */
function roundedPercentages(counts, total) {
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((c) => (c / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  exact
    .map((v, i) => ({ i, rem: v - floors[i] }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
    .forEach(({ i }) => {
      if (left > 0 && counts[i] > 0) { floors[i] += 1; left -= 1; }
    });
  return floors;
}

/**
 * @returns {{
 *   options: {index:number,label:string,tone:string,count:number,percentage:number,rounded:number}[],
 *   total: number,
 *   uniqueVoters: number,
 *   leader: null | {index:number,label:string,count:number,percentage:number,rounded:number,tie:boolean}
 * }}
 *   percentage is exact (0-100); rounded is an integer and sums to 100.
 *   leader is null with no votes; on a tie it is the first of the tied options
 *   with tie = true.
 */
export function getPollTally(poll) {
  const labels = resolveOptions(poll);
  const counts = resolveCounts(poll, labels);
  const total = counts.reduce((a, b) => a + b, 0);
  const rounded = roundedPercentages(counts, total);

  const options = labels.map((label, index) => ({
    index,
    label,
    tone: optionTone(label),
    count: counts[index],
    percentage: total > 0 ? (counts[index] / total) * 100 : 0,
    rounded: rounded[index],
  }));

  let leader = null;
  if (total > 0) {
    const top = Math.max(...counts);
    const tied = options.filter((o) => o.count === top);
    leader = { ...tied[0], tie: tied.length > 1 };
  }

  // One vote per user per poll is enforced by the cast endpoint, so when the
  // API has not supplied a distinct-voter count the total is the best figure.
  const reported = poll?.unique_voters;
  const uniqueVoters = reported !== null && reported !== undefined && Number.isFinite(Number(reported))
    ? toCount(reported)
    : total;

  return { options, total, uniqueVoters, leader };
}

/**
 * The poll with one vote added at `optionIndex` (and removed from
 * `previousIndex` when a vote is changed), for optimistic UI. Returns a new
 * object in the reconciled shape that getPollTally reads first.
 */
export function withVoteApplied(poll, optionIndex, previousIndex = null) {
  const { options, total, uniqueVoters } = getPollTally(poll);
  const counts = options.map((o) => o.count);
  if (optionIndex < 0 || optionIndex >= counts.length) return poll;

  counts[optionIndex] += 1;
  const isChange = previousIndex !== null && previousIndex !== undefined && counts[previousIndex] > 0;
  if (isChange) counts[previousIndex] -= 1;

  return {
    ...poll,
    vote_counts: counts,
    votes: Object.fromEntries(counts.map((n, i) => [i, n])),
    total_votes: isChange ? total : total + 1,
    unique_voters: isChange ? uniqueVoters : uniqueVoters + 1,
  };
}
