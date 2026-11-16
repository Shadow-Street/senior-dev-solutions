import { getPollTally } from '@/lib/pollVotes';

/**
 * Presentation helpers for Poll Management. All vote maths goes through
 * getPollTally (src/lib/pollVotes.js), the same function the member-facing
 * poll cards use, over counts the API has already reconciled from PollVote rows.
 */

export const STATUS_META = {
  active: { label: 'Active', className: 'bg-buy-muted text-buy-muted-foreground border-transparent' },
  closed: { label: 'Closed', className: 'bg-surface-2 text-subtle border-border' },
  hidden: { label: 'Hidden', className: 'bg-sell-muted text-sell-muted-foreground border-transparent' },
};

export const POLL_TYPE_LABELS = {
  buy_sell_hold: 'Buy / Sell / Hold',
  sentiment: 'Sentiment',
  price_target: 'Price target',
  yes_no: 'Yes / No',
  admin_recommendation: 'Admin recommendation',
  custom: 'Custom',
  unspecified: 'Unspecified',
};

export const DEFAULT_OPTIONS = {
  buy_sell_hold: ['Buy', 'Sell', 'Hold'],
  admin_recommendation: ['Buy', 'Sell', 'Hold'],
  sentiment: ['Bullish', 'Bearish', 'Neutral'],
  price_target: ['Yes', 'No'],
  yes_no: ['Yes', 'No'],
  custom: ['', ''],
};

export const pollIdOf = (poll) => poll?.id ?? null;
export const pollTitle = (poll) => poll?.title || poll?.question || 'Untitled poll';
export const typeLabel = (type) => POLL_TYPE_LABELS[type || 'unspecified'] || type;

/**
 * Sentiment across polls: every vote is attributed to its option's tone
 * (Buy/Bullish/Yes = positive, Sell/Bearish/No = negative, Hold/Neutral =
 * neutral, anything else = other). Shares are of all votes counted.
 */
export function sentimentBreakdown(polls = []) {
  const totals = { positive: 0, negative: 0, neutral: 0, other: 0 };
  for (const poll of polls) {
    for (const option of getPollTally(poll).options) totals[option.tone] += option.count;
  }
  const all = Object.values(totals).reduce((a, b) => a + b, 0);
  const share = (n) => (all > 0 ? Math.round((n / all) * 1000) / 10 : 0);
  return {
    total: all,
    items: [
      { key: 'positive', label: 'Positive (Buy / Bullish / Yes)', count: totals.positive, share: share(totals.positive) },
      { key: 'negative', label: 'Negative (Sell / Bearish / No)', count: totals.negative, share: share(totals.negative) },
      { key: 'neutral', label: 'Neutral (Hold / Neutral)', count: totals.neutral, share: share(totals.neutral) },
      { key: 'other', label: 'Other options', count: totals.other, share: share(totals.other) },
    ],
  };
}

/**
 * Consensus = the leading option's share of a poll's votes.
 *   average   mean consensus over polls with at least one vote
 *   strong    polls where the leader has 70% or more
 *   split     polls with a tie for first place, or a leader under 50%
 */
export function consensusStats(polls = []) {
  const voted = polls.map(getPollTally).filter((t) => t.total > 0);
  if (!voted.length) return { polls: 0, average: 0, strong: 0, split: 0 };
  const shares = voted.map((t) => t.leader.percentage);
  return {
    polls: voted.length,
    average: Math.round((shares.reduce((a, b) => a + b, 0) / voted.length) * 10) / 10,
    strong: voted.filter((t) => t.leader.percentage >= 70).length,
    split: voted.filter((t) => t.leader.tie || t.leader.percentage < 50).length,
  };
}

/** Polls ranked for the Top Performing widget. */
export function rankPolls(polls = [], metric = 'votes', limit = 3) {
  const score = (poll) => {
    const t = getPollTally(poll);
    if (metric === 'voters') return t.uniqueVoters;
    if (metric === 'consensus') return t.total > 0 ? t.leader.percentage : -1;
    return t.total;
  };
  return [...polls]
    .map((poll) => ({ poll, score: score(poll), tally: getPollTally(poll) }))
    .filter((r) => (metric === 'consensus' ? r.tally.total > 0 : true))
    .sort((a, b) => b.score - a.score || b.tally.total - a.tally.total)
    .slice(0, limit);
}

/** "2026-11-03" -> "3 Nov" without time-zone drift. */
export function bucketLabel(isoDay, bucket = 'day') {
  const [y, m, d] = String(isoDay).split('-').map(Number);
  if (!y || !m || !d) return String(isoDay);
  const date = new Date(Date.UTC(y, m - 1, d));
  const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return bucket === 'week' ? `Wk of ${label}` : label;
}

/** Value for <input type="datetime-local"> in the browser's zone. */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** CSV cell, quoted, with spreadsheet formula injection neutralised. */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function pollsToCsv(polls = []) {
  const headers = ['Title', 'Stock', 'Type', 'Access', 'Created by admin', 'Status', 'Featured', 'Total votes', 'Unique voters', 'Leading option', 'Leader share %', 'Options', 'Created', 'Ends'];
  const rows = polls.map((poll) => {
    const t = getPollTally(poll);
    return [
      pollTitle(poll),
      poll.stock_symbol || '',
      typeLabel(poll.poll_type),
      poll.is_premium ? 'Premium' : 'General',
      poll.is_admin_poll ? 'Yes' : 'No',
      STATUS_META[poll.admin_status]?.label || poll.admin_status || '',
      poll.is_featured ? 'Yes' : 'No',
      t.total,
      t.uniqueVoters,
      t.leader ? (t.leader.tie ? `Tie (${t.leader.label})` : t.leader.label) : '',
      t.leader ? t.leader.rounded : '',
      t.options.map((o) => `${o.label}: ${o.count}`).join('; '),
      poll.created_at ? new Date(poll.created_at).toISOString() : '',
      poll.expires_at ? new Date(poll.expires_at).toISOString() : '',
    ];
  });
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/**
 * Saves `text` as a file. The link is attached to the document before the
 * click and the object URL is revoked a tick later: revoking straight after
 * click() on a detached link cancels the download in some browsers.
 */
export function downloadTextFile(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
