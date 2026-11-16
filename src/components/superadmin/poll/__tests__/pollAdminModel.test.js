import { describe, it, expect, vi } from 'vitest';
import { sentimentBreakdown, consensusStats, rankPolls, csvCell, pollsToCsv, bucketLabel, downloadTextFile } from '../pollAdminModel';

const poll = (id, options, counts, extra = {}) => ({ id, title: id, options, vote_counts: counts, unique_voters: counts.reduce((a, b) => a + b, 0), ...extra });

describe('pollAdminModel', () => {
  const polls = [
    poll('a', ['Buy', 'Sell', 'Hold'], [6, 2, 2]),
    poll('b', ['Bullish', 'Bearish', 'Neutral'], [1, 1, 0]),
    poll('c', ['Yes', 'No'], [0, 0]),
    poll('d', ['Nifty 22k', 'Nifty 24k'], [1, 3]),
  ];

  it('sentiment attributes votes by option tone and shares add up to 100', () => {
    const s = sentimentBreakdown(polls);
    const by = Object.fromEntries(s.items.map((i) => [i.key, i.count]));
    expect(by).toEqual({ positive: 7, negative: 3, neutral: 2, other: 4 });
    expect(s.total).toBe(16);
    expect(s.items.reduce((a, i) => a + i.share, 0)).toBeCloseTo(100, 0);
  });

  it('consensus averages leader share over polls with votes only', () => {
    const c = consensusStats(polls);
    expect(c.polls).toBe(3);
    expect(c.average).toBeCloseTo((60 + 50 + 75) / 3, 1);
    expect(c.strong).toBe(1); // d: 75%
    expect(c.split).toBe(1); // b: tie
  });

  it('ranks top polls by votes, voters or consensus', () => {
    expect(rankPolls(polls, 'votes').map((r) => r.poll.id)).toEqual(['a', 'd', 'b']);
    expect(rankPolls(polls, 'consensus').map((r) => r.poll.id)).toEqual(['d', 'a', 'b']);
  });

  it('CSV cells neutralise spreadsheet formulas and quotes', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(pollsToCsv([polls[0]]).split('\n')[1]).toContain('"Buy: 6; Sell: 2; Hold: 2"');
  });

  it('labels buckets without time-zone drift', () => {
    expect(bucketLabel('2026-11-03')).toMatch(/3/);
    expect(bucketLabel('2026-11-02', 'week')).toMatch(/^Wk of/);
  });
});

describe('downloadTextFile', () => {
  it('clicks an attached link and revokes the URL only after a tick', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:poll-export');
    const revoke = vi.fn();
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    let attachedAtClick = null;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      attachedAtClick = document.body.contains(this);
    });
    try {
      downloadTextFile('polls.csv', 'a,b');
      expect(click).toHaveBeenCalledTimes(1);
      expect(attachedAtClick).toBe(true);
      expect(revoke).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledWith('blob:poll-export');
      expect(document.querySelector('a[download]')).toBeNull();
    } finally {
      click.mockRestore();
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
      vi.useRealTimers();
    }
  });
});
