import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Query-string state, so a view is a link.
 *
 * `history.replaceState` rather than `pushState`: flipping a range four times
 * should not leave four entries the back button has to walk out of, and the
 * current URL stays copyable at all times either way. `replaceState` fires no
 * event, so writers notify subscribers directly.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

// A primitive snapshot: useSyncExternalStore compares by identity, and a fresh
// URLSearchParams every call would loop forever.
const getSearch = () => window.location.search;
const getServerSearch = () => "";

export function useUrlParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useSetUrlParams(): (mutate: (params: URLSearchParams) => void) => void {
  return useCallback((mutate) => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
    for (const l of [...listeners]) l();
  }, []);
}

/** Set a param, or drop it entirely when the value is empty — no `?chain=` noise. */
export function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}
