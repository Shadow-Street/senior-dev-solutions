import { useSyncExternalStore } from 'react';
import { AdsSetting } from '@/lib/apiClient';

/**
 * Global advertisement switch, shared by every placement.
 *
 * One module-level store, one in-flight request, one poll timer no matter how
 * many components subscribe.
 *
 * Semantics
 *  - Unknown (nothing fetched yet, or every fetch failed so far): no ads. We
 *    show nothing rather than flash ads that may be switched off.
 *  - A failed refresh keeps the last known value.
 *  - The server defaults to "enabled" when the setting was never written.
 *
 * Propagation
 *  - The admin's own tab: setAdsEnabled() pushes straight into the store.
 *  - Everyone else: re-fetch every POLL_MS (45s), when the tab becomes
 *    visible again, and when the window regains focus. There is no
 *    platform-settings WebSocket broadcast to use (the socket is
 *    authenticated-only and carries chat/notification events).
 */
export const POLL_MS = 45_000;

let value = null; // null = unknown, true / false = last known server value
let inflight = null;
let timer = null;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());

const setValue = (next) => {
  if (value === next) return;
  value = next;
  emit();
};

export function refreshAdsEnabled() {
  if (inflight) return inflight;
  inflight = AdsSetting.get()
    .then((data) => {
      if (typeof data?.enabled === 'boolean') setValue(data.enabled);
    })
    .catch(() => {
      // Keep the last known value (or stay unknown => no ads).
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Call after a successful admin write so this tab updates immediately. */
export function setAdsEnabled(next) {
  if (typeof next === 'boolean') setValue(next);
}

const onVisible = () => {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') refreshAdsEnabled();
};
const onFocus = () => refreshAdsEnabled();

const start = () => {
  refreshAdsEnabled();
  timer = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') refreshAdsEnabled();
  }, POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onFocus);
};

const stop = () => {
  clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('focus', onFocus);
};

const subscribe = (listener) => {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
};

const getSnapshot = () => value;

/** { enabled, known } - `enabled` is true only when the server said so. */
export function useAdsStatus() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { enabled: current === true, known: current !== null };
}

/** true only when advertisements are known to be enabled. */
export function useAdsEnabled() {
  return useAdsStatus().enabled;
}

/** Test helper: wipe the module state. */
export function __resetAdsEnabledForTests() {
  value = null;
  inflight = null;
  clearInterval(timer);
  timer = null;
  listeners.clear();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onFocus);
  }
}

export default useAdsEnabled;
