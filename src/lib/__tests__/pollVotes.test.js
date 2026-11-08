import { describe, it, expect } from 'vitest';
import { getPollTally, optionTone, withVoteApplied } from '../pollVotes';

const labels = (t) => t.options.map((o) => o.label);
const counts = (t) => t.options.map((o) => o.count);

describe('getPollTally', () => {
  it('reads reconciled vote_counts first', () => {
    const t = getPollTally({
      options: ['Buy', 'Sell', 'Hold'],
      vote_counts: [3, 0, 1],
      votes: { 0: 99 },
      buy_votes: 50,
      total_votes: 9,
      unique_voters: 4,
    });
    expect(counts(t)).toEqual([3, 0, 1]);
    expect(t.total).toBe(4);
    expect(t.uniqueVoters).toBe(4);
    expect(t.leader).toMatchObject({ label: 'Buy', rounded: 75, tie: false });
  });

  it('TCS-like poll: total_votes disagrees with the options, so total is their sum', () => {
    // Counter says 9 votes, the options only account for 4.
    const t = getPollTally({
      options: ['Buy', 'Sell', 'Hold'],
      votes: { 0: 3, 2: 1 },
      total_votes: 9,
    });
    expect(counts(t)).toEqual([3, 0, 1]);
    expect(t.total).toBe(4);
    expect(t.options.reduce((a, o) => a + o.count, 0)).toBe(t.total);
    expect(t.options.map((o) => o.rounded)).toEqual([75, 0, 25]);
    expect(t.options[0].percentage).toBeCloseTo(75);
    expect(t.uniqueVoters).toBe(4);
  });

  it('buy/sell/hold poll: JPL with one vote shows 100% on the voted option, not 0%', () => {
    const t = getPollTally({
      poll_type: 'buy_sell_hold',
      options: ['Buy', 'Sell', 'Hold'],
      votes: { 1: 1 },
      total_votes: 1,
      buy_votes: 0, sell_votes: 0, hold_votes: 0, // legacy counters never updated
    });
    expect(t.options.map((o) => o.rounded)).toEqual([0, 100, 0]);
    expect(t.leader).toMatchObject({ label: 'Sell', count: 1, rounded: 100 });
    expect(t.uniqueVoters).toBe(1);
  });

  it('sentiment poll: Bullish / Bearish / Neutral by option label', () => {
    const t = getPollTally({
      poll_type: 'sentiment',
      options: ['Bullish', 'Bearish', 'Neutral'],
      votes: { 0: 2, 1: 1, 2: 1 },
    });
    expect(labels(t)).toEqual(['Bullish', 'Bearish', 'Neutral']);
    expect(t.options.map((o) => o.tone)).toEqual(['positive', 'negative', 'neutral']);
    expect(t.total).toBe(4);
    expect(t.leader.label).toBe('Bullish');
  });

  it('falls back to legacy named counters when no votes map exists', () => {
    const t = getPollTally({ buy_votes: 5, sell_votes: 3, hold_votes: 2 });
    expect(labels(t)).toEqual(['Buy', 'Sell', 'Hold']);
    expect(counts(t)).toEqual([5, 3, 2]);
    expect(t.total).toBe(10);
    expect(t.options.map((o) => o.rounded)).toEqual([50, 30, 20]);
  });

  it('infers sentiment options from legacy sentiment counters', () => {
    const t = getPollTally({ bullish_votes: 2, bearish_votes: 1, neutral_votes: 0 });
    expect(labels(t)).toEqual(['Bullish', 'Bearish', 'Neutral']);
    expect(counts(t)).toEqual([2, 1, 0]);
  });

  it('zero votes: all zero, no leader, no NaN', () => {
    const t = getPollTally({ options: ['Buy', 'Sell', 'Hold'], votes: {}, total_votes: 0 });
    expect(t.total).toBe(0);
    expect(t.uniqueVoters).toBe(0);
    expect(t.leader).toBeNull();
    t.options.forEach((o) => {
      expect(o.percentage).toBe(0);
      expect(o.rounded).toBe(0);
    });
  });

  it('copes with a missing or empty poll', () => {
    expect(getPollTally(undefined).total).toBe(0);
    expect(getPollTally({}).leader).toBeNull();
  });

  it('rounded percentages always add up to 100', () => {
    const t = getPollTally({ options: ['A', 'B', 'C'], vote_counts: [1, 1, 1] });
    expect(t.options.reduce((a, o) => a + o.rounded, 0)).toBe(100);
  });

  it('flags a tie for the lead', () => {
    const t = getPollTally({ options: ['Buy', 'Sell'], vote_counts: [2, 2] });
    expect(t.leader).toMatchObject({ label: 'Buy', tie: true });
  });

  it('reports unique voters separately when the API supplies them', () => {
    const t = getPollTally({ options: ['Yes', 'No'], vote_counts: [2, 1], unique_voters: 3 });
    expect(t.uniqueVoters).toBe(3);
  });

  it('ignores negative and non-numeric counters', () => {
    const t = getPollTally({ options: ['Buy', 'Sell'], vote_counts: [-4, 'x'] });
    expect(counts(t)).toEqual([0, 0]);
  });
});

describe('optionTone', () => {
  it('classifies option labels case-insensitively', () => {
    expect(optionTone('BUY')).toBe('positive');
    expect(optionTone('Bearish')).toBe('negative');
    expect(optionTone('hold')).toBe('neutral');
    expect(optionTone('Will Pledge')).toBe('other');
  });
});

describe('withVoteApplied', () => {
  it('adds a new vote to option and totals', () => {
    const next = withVoteApplied({ options: ['Buy', 'Sell', 'Hold'], vote_counts: [1, 0, 0], unique_voters: 1 }, 2);
    expect(getPollTally(next).options.map((o) => o.count)).toEqual([1, 0, 1]);
    expect(next.total_votes).toBe(2);
    expect(next.unique_voters).toBe(2);
  });

  it('moves a vote without changing totals', () => {
    const next = withVoteApplied({ options: ['Buy', 'Sell'], vote_counts: [1, 0] }, 1, 0);
    expect(getPollTally(next).options.map((o) => o.count)).toEqual([0, 1]);
    expect(next.total_votes).toBe(1);
  });

  it('leaves the poll alone for an out-of-range option', () => {
    const poll = { options: ['Buy', 'Sell'], vote_counts: [1, 0] };
    expect(withVoteApplied(poll, 5)).toBe(poll);
  });
});
