import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('../poll/pollAdminApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    pollAdminApi: {
      summary: vi.fn(),
      list: vi.fn(),
      analytics: vi.fn(),
      details: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      action: vi.fn(),
      remove: vi.fn(),
      getTomorrowsPick: vi.fn(),
      saveTomorrowsPick: vi.fn(),
    },
  };
});

import PollManagement from '../PollManagement';
import { pollAdminApi } from '../poll/pollAdminApi';
import { usePollActions } from '../poll/usePollActions';

const SUMMARY = { total: 6, active: 6, closed: 0, hidden: 0, featured: 0, premium: 1, admin: 2, total_votes: 11, unique_voters: 5, avg_votes_per_poll: 1.8 };
const POLL = {
  id: 'p1', title: 'RELIANCE before results?', stock_symbol: 'RELIANCE', options: ['Buy', 'Sell', 'Hold'],
  vote_counts: [3, 1, 0], total_votes: 4, unique_voters: 4, admin_status: 'active', is_featured: false, created_at: '2026-11-01T10:00:00Z',
};
const ANALYTICS = {
  range: 'all', since: null, bucket: 'day', generated_at: '2026-11-09T10:00:00Z', truncated: false,
  participation: { total_votes: 4, unique_voters: 4, registered_users: 40, turnout_pct: 10, polls_in_scope: 1, polls_with_votes: 1, participation_rate: 100, avg_votes_per_poll: 4, votes_per_voter: 1 },
  status_counts: { active: 1, closed: 0, hidden: 0 },
  activity: [{ start: '2026-11-08', votes: 1, voters: 1, new_polls: 0 }, { start: '2026-11-09', votes: 3, voters: 3, new_polls: 1 }],
  segments: { premium: { polls: 0, votes: 0, voters: 0, avg_votes_per_poll: 0 }, general: { polls: 1, votes: 4, voters: 4, avg_votes_per_poll: 4 }, admin: { polls: 1, votes: 4, voters: 4, avg_votes_per_poll: 4 }, community: { polls: 0, votes: 0, voters: 0, avg_votes_per_poll: 0 } },
  by_type: [], top_stocks: [{ symbol: 'RELIANCE', polls: 1, votes: 4 }],
  polls: [POLL],
};
const ADMIN = { id: 'u-admin', app_role: 'super_admin' };

const activate = (name) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });

beforeEach(() => {
  sessionStorage.clear();
  pollAdminApi.summary.mockResolvedValue(SUMMARY);
  pollAdminApi.analytics.mockResolvedValue(ANALYTICS);
  pollAdminApi.list.mockResolvedValue({ items: [POLL], total: 1, page: 1, limit: 20, pages: 1 });
  pollAdminApi.getTomorrowsPick.mockResolvedValue({ active: false });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Poll Management', () => {
  it('is titled Poll Management, not Polls & Pledges', async () => {
    render(<PollManagement user={ADMIN} />);
    expect(screen.getByRole('heading', { name: 'Poll Management' })).toBeInTheDocument();
    expect(screen.queryByText(/Pledges/)).not.toBeInTheDocument();
    await screen.findByText('11');
  });

  // Regression: the page used to re-fetch on 5 s / 10 s timers and replace the
  // whole screen with a spinner on every fetch, so it looked like it kept refreshing.
  it('fetches once on mount and does not poll or re-fetch on re-render', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { rerender } = render(<PollManagement user={ADMIN} />);
    await screen.findByText('11');
    await screen.findAllByText('RELIANCE before results?');

    expect(pollAdminApi.summary).toHaveBeenCalledTimes(1);
    expect(pollAdminApi.analytics).toHaveBeenCalledTimes(1);

    // A parent re-render with a fresh user object (same person) must not refetch.
    rerender(<PollManagement user={{ ...ADMIN }} />);
    await act(async () => { vi.advanceTimersByTime(60_000); });

    expect(pollAdminApi.summary).toHaveBeenCalledTimes(1);
    expect(pollAdminApi.analytics).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Loading Poll Management/i)).not.toBeInTheDocument();
  });

  it('Refresh re-fetches without blanking the stat cards', async () => {
    render(<PollManagement user={ADMIN} />);
    await screen.findByText('11');
    let release;
    pollAdminApi.summary.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(pollAdminApi.summary).toHaveBeenCalledTimes(2));
    expect(screen.getByText('11')).toBeInTheDocument(); // still showing while the request runs
    await act(async () => release({ ...SUMMARY, total_votes: 12 }));
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  it('renders real Top Performing Polls cards from the analytics counts', async () => {
    render(<PollManagement user={ADMIN} />);
    expect(await screen.findByText('Top Performing Polls')).toBeInTheDocument();
    expect(await screen.findByText('RELIANCE before results?')).toBeInTheDocument();
    expect(screen.getByText('3 (75%)')).toBeInTheDocument();
    expect(screen.getByText('1 (25%)')).toBeInTheDocument();
  });

  it('keeps tab content (and typed filters) when switching tabs', async () => {
    render(<PollManagement user={ADMIN} />);
    await screen.findByText('11');
    activate('Manage Polls');
    const search = await screen.findByRole('textbox', { name: 'Search polls' });
    fireEvent.change(search, { target: { value: 'RELI' } });
    await waitFor(() => expect(pollAdminApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'RELI' })));
    const listCalls = pollAdminApi.list.mock.calls.length;

    activate('Analytics');
    await screen.findByText('Voting activity');
    activate('Manage Polls');

    expect(screen.getByRole('textbox', { name: 'Search polls' })).toHaveValue('RELI');
    expect(pollAdminApi.list.mock.calls.length).toBe(listCalls);
  });

  it('shows an error with a retry instead of a blank page', async () => {
    pollAdminApi.analytics.mockRejectedValue({ response: { status: 500 } });
    render(<PollManagement user={ADMIN} />);
    expect(await screen.findByText('Could not load top polls.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Try again' }).length).toBeGreaterThan(0);
  });
});

describe('usePollActions', () => {
  let actions;
  const onDone = vi.fn();
  function Harness() {
    actions = usePollActions({ onDone });
    return actions.dialog || null;
  }

  it('hide asks for a reason and sends it', async () => {
    pollAdminApi.action.mockResolvedValue({});
    render(<Harness />);
    await act(async () => { await actions.run('hide', POLL); });
    fireEvent.click(screen.getByRole('button', { name: 'Hide poll' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/reason/i);
    expect(pollAdminApi.action).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Spam tip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hide poll' }));
    await waitFor(() => expect(pollAdminApi.action).toHaveBeenCalledWith('p1', 'hide', { reason: 'Spam tip' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('close runs straight away without a dialog', async () => {
    pollAdminApi.action.mockResolvedValue({});
    render(<Harness />);
    await act(async () => { await actions.run('close', POLL); });
    expect(pollAdminApi.action).toHaveBeenCalledWith('p1', 'close');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('delete needs confirmation', async () => {
    pollAdminApi.remove.mockResolvedValue({ success: true, deleted_votes: 4 });
    render(<Harness />);
    await act(async () => { await actions.run('delete', POLL); });
    expect(pollAdminApi.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete poll and votes' }));
    await waitFor(() => expect(pollAdminApi.remove).toHaveBeenCalledWith('p1'));
    expect(onDone).toHaveBeenCalledWith(expect.stringContaining('4 votes'), { deleted: true });
  });
});
