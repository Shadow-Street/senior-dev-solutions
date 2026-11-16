import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads one Poll Management resource.
 *
 * The old page re-fetched every 5 s and 10 s on timers and swapped the whole
 * screen for a spinner on every fetch, which is what looked like the page
 * "refreshing" and threw away open forms. Here:
 *   - a fetch runs only when `key` changes (a string, so a new object each
 *     render can never retrigger it) or reload() is called;
 *   - the previous data stays on screen while a re-fetch runs (isFetching),
 *     isLoading is true only before the first response;
 *   - a slower, older response never overwrites a newer one.
 */
export function usePollAdminResource(load, key) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState({ data: null, error: null, isLoading: true, isFetching: true });
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    let active = true;
    setState((s) => ({ ...s, isFetching: true, error: null }));
    Promise.resolve()
      .then(() => loadRef.current())
      .then((data) => {
        if (active && id === requestId.current) setState({ data, error: null, isLoading: false, isFetching: false });
      })
      .catch((error) => {
        if (active && id === requestId.current) setState((s) => ({ ...s, error, isLoading: false, isFetching: false }));
      });
    return () => {
      active = false;
    };
  }, [key, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);
  return { ...state, reload };
}

/** useState that survives switching Super Admin tabs (sessionStorage, best effort). */
export function useSessionState(storageKey, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw === null ? initial : { ...initial, ...JSON.parse(raw) };
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage unavailable: state simply resets on remount.
    }
  }, [storageKey, value]);
  return [value, setValue];
}

/** `value`, updated only after it has stopped changing for `ms`. */
export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
