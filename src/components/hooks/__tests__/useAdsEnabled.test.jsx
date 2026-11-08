import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ AdsSetting: { get, set: vi.fn() } }));

import { useAdsStatus, setAdsEnabled, refreshAdsEnabled, __resetAdsEnabledForTests, POLL_MS } from '../useAdsEnabled';

function Probe() {
  const { enabled, known } = useAdsStatus();
  return <p data-testid="p">{known ? (enabled ? 'on' : 'off') : 'unknown'}</p>;
}
const text = () => screen.getByTestId('p').textContent;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('useAdsEnabled', () => {
  beforeEach(() => { vi.useFakeTimers(); get.mockReset(); });
  afterEach(() => { cleanup(); __resetAdsEnabledForTests(); vi.useRealTimers(); });

  it('reports no ads until the first answer arrives, then follows the server', async () => {
    get.mockResolvedValue({ enabled: true });
    render(<Probe />);
    expect(text()).toBe('unknown');
    await flush();
    expect(text()).toBe('on');
  });

  it('shares a single request between many subscribers', async () => {
    get.mockResolvedValue({ enabled: true });
    render(<><Probe /><Probe /><Probe /></>);
    await flush();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('stays at "no ads" when the very first fetch fails', async () => {
    get.mockRejectedValue(new Error('network'));
    render(<Probe />);
    await flush();
    expect(text()).toBe('unknown');
  });

  it('keeps the last known value when a later refresh fails', async () => {
    get.mockResolvedValueOnce({ enabled: false });
    render(<Probe />);
    await flush();
    expect(text()).toBe('off');
    get.mockRejectedValue(new Error('network'));
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(get).toHaveBeenCalledTimes(2);
    expect(text()).toBe('off');
  });

  it('picks up a server-side change on the next poll (<= 60s)', async () => {
    expect(POLL_MS).toBeLessThanOrEqual(60_000);
    get.mockResolvedValueOnce({ enabled: true });
    render(<Probe />);
    await flush();
    expect(text()).toBe('on');
    get.mockResolvedValue({ enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(text()).toBe('off');
  });

  it('refreshes when the window regains focus', async () => {
    get.mockResolvedValueOnce({ enabled: true });
    render(<Probe />);
    await flush();
    get.mockResolvedValue({ enabled: false });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await flush();
    expect(text()).toBe('off');
  });

  it('setAdsEnabled updates every subscriber immediately (admin toggle)', async () => {
    get.mockResolvedValue({ enabled: true });
    render(<Probe />);
    await flush();
    act(() => setAdsEnabled(false));
    expect(text()).toBe('off');
  });

  it('ignores malformed responses', async () => {
    get.mockResolvedValue({ enabled: 'yes' });
    render(<Probe />);
    await flush();
    expect(text()).toBe('unknown');
    await act(async () => { await refreshAdsEnabled(); });
    expect(text()).toBe('unknown');
  });
});
