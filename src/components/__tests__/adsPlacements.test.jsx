import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { get, set } = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ AdsSetting: { get, set } }));
vi.mock('@/components/dashboard/MarketOverviewPanel', () => ({
  default: () => <div data-testid="market">market</div>,
}));
vi.mock('@/components/common/BrandLogo', () => ({ renderBrandLogo: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { __resetAdsEnabledForTests, setAdsEnabled } from '@/components/hooks/useAdsEnabled';
import AdDisplay from '@/components/dashboard/AdDisplay';
import SponsoredPanel from '@/components/dashboard/SponsoredPanel';
import MarketSponsoredRow from '@/components/dashboard/MarketSponsoredRow';
import { POLL_GRID_CLASS, buildPollGridCells } from '@/components/polls/PollGrid';
import { useAdsEnabled } from '@/components/hooks/useAdsEnabled';
import { pollShowsAd } from '@/components/polls/pollAd';
import AdsMasterSwitch from '@/components/superadmin/AdsMasterSwitch';

// Same wiring as src/pages/Polls.jsx.
function makePollGrid(polls, renderPoll) {
  return function PollGrid() {
    const adsEnabled = useAdsEnabled();
    return <div className={POLL_GRID_CLASS} data-testid="poll-grid">{buildPollGridCells(polls, renderPoll, adsEnabled)}</div>;
  };
}

const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const renderWithAds = async (ui, enabled) => {
  get.mockResolvedValue({ enabled });
  const view = render(<MemoryRouter>{ui}</MemoryRouter>);
  await settle();
  return view;
};

// Find ids that do / do not get a sponsored card so the grid test is deterministic.
const ids = Array.from({ length: 60 }, (_, i) => `poll-${i}`);
const withAd = ids.filter((id) => pollShowsAd(id, true)).slice(0, 2);
const withoutAd = ids.filter((id) => !pollShowsAd(id, true)).slice(0, 3);
const polls = [...withAd, ...withoutAd].map((id) => ({ id, stock_symbol: 'ABC' }));

beforeEach(() => { get.mockReset(); set.mockReset(); });
afterEach(() => { cleanup(); __resetAdsEnabledForTests(); });

describe('AdDisplay (chat sidebar, chat mobile, embedded poll card, stocks)', () => {
  it('renders the sponsored card when ads are enabled', async () => {
    await renderWithAds(<AdDisplay placement="chatrooms_sidebar" />, true);
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByText('Invest Smart with Zero Brokerage')).toBeInTheDocument();
  });
  it('renders nothing when disabled', async () => {
    const { container } = await renderWithAds(<AdDisplay placement="chatrooms_sidebar" />, false);
    expect(screen.queryByText('Sponsored')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
  it('renders nothing while the setting is unknown (no flash)', () => {
    get.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdDisplay />);
    expect(container).toBeEmptyDOMElement();
  });
  it('disappears for an open page when the admin switches ads off', async () => {
    await renderWithAds(<AdDisplay />, true);
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    act(() => setAdsEnabled(false));
    expect(screen.queryByText('Sponsored')).toBeNull();
  });
});

describe('Dashboard sponsored panel', () => {
  it('SponsoredPanel shows when enabled and renders nothing when disabled', async () => {
    const on = await renderWithAds(<SponsoredPanel />, true);
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    on.unmount();
    __resetAdsEnabledForTests();
    const off = await renderWithAds(<SponsoredPanel />, false);
    expect(off.container).toBeEmptyDOMElement();
  });

  it('market row: two columns with ads, full width and no empty column without', async () => {
    const on = await renderWithAds(<MarketSponsoredRow indices={[]} error={null} />, true);
    const row = screen.getByTestId('market-sponsored-row');
    expect(row.children).toHaveLength(2);
    expect(within(row).getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByTestId('market').parentElement).toHaveClass('xl:col-span-2');
    on.unmount();
    __resetAdsEnabledForTests();

    await renderWithAds(<MarketSponsoredRow indices={[]} error={null} />, false);
    const row2 = screen.getByTestId('market-sponsored-row');
    expect(row2.children).toHaveLength(1);
    expect(screen.queryByText('Sponsored')).toBeNull();
    expect(screen.getByTestId('market').parentElement).toHaveClass('xl:col-span-3');
  });
});

describe('Polls grid', () => {
  const renderPoll = (p) => <article data-testid="poll">{p.id}</article>;
  const Grid = makePollGrid(polls, renderPoll);

  it('inserts sponsored cells when enabled', async () => {
    expect(withAd.length).toBe(2);
    await renderWithAds(<Grid />, true);
    expect(screen.getAllByTestId('poll-ad-cell')).toHaveLength(2);
    expect(screen.getByTestId('poll-grid').children).toHaveLength(polls.length + 2);
  });

  it('has exactly one cell per poll and no gaps when disabled', async () => {
    await renderWithAds(<Grid />, false);
    const grid = screen.getByTestId('poll-grid');
    expect(screen.queryAllByTestId('poll-ad-cell')).toHaveLength(0);
    expect(grid.children).toHaveLength(polls.length);
    for (const cell of grid.children) expect(within(cell).getByTestId('poll')).toBeInTheDocument();
  });

  it('pollShowsAd (also used by the embedded PollCard) is false unless explicitly enabled', () => {
    for (const id of withAd) {
      expect(pollShowsAd(id, true)).toBe(true);
      expect(pollShowsAd(id, false)).toBe(false);
      expect(pollShowsAd(id, undefined)).toBe(false);
      expect(pollShowsAd(id)).toBe(false);
    }
  });
});

describe('AdsMasterSwitch (admin)', () => {
  it('asks for confirmation, saves, and updates the shared store at once', async () => {
    get.mockResolvedValue({ enabled: true });
    set.mockResolvedValue({ enabled: false });
    render(<><AdsMasterSwitch /><AdDisplay /></>);
    await settle();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();

    const sw = screen.getByRole('switch', { name: 'Advertisements' });
    expect(sw).toBeChecked();
    await act(async () => { sw.click(); });
    expect(set).not.toHaveBeenCalled(); // needs confirming first
    expect(screen.getByText('Disable advertisements?')).toBeInTheDocument();

    await act(async () => { screen.getByRole('button', { name: 'Disable' }).click(); });
    await settle();
    expect(set).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Sponsored')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Advertisements' })).not.toBeChecked();
  });

  it('cancel changes nothing; a failed save leaves the switch where the server has it', async () => {
    get.mockResolvedValue({ enabled: true });
    set.mockRejectedValue({ response: { data: { error: 'Admin access required' } } });
    render(<AdsMasterSwitch />);
    await settle();
    await act(async () => { screen.getByRole('switch', { name: 'Advertisements' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Cancel' }).click(); });
    expect(set).not.toHaveBeenCalled();

    await act(async () => { screen.getByRole('switch', { name: 'Advertisements' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Disable' }).click(); });
    await settle();
    expect(screen.getByRole('switch', { name: 'Advertisements' })).toBeChecked();
  });

  it('is disabled with a retry while the status is unknown', async () => {
    get.mockRejectedValue(new Error('network'));
    render(<AdsMasterSwitch />);
    await settle();
    expect(screen.getByRole('switch', { name: 'Advertisements' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
