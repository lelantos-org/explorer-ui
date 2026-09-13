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

/**
 * A param holding one of a known set of values.
 *
 * Two things it refuses to do, both for the same reason — the query string is
 * hand-editable and shared, so it is untrusted input with a reader on the other
 * end:
 *
 * - An unrecognised value falls back rather than rendering nothing. A typo
 *   should cost the view that was asked for, not the page.
 * - The default is written as an absent param rather than `?tab=activity`, so
 *   the default view and a link to it are the same URL. Otherwise two links to
 *   the same thing differ by whether someone happened to touch the control.
 */
export function useUrlChoice<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const params = useUrlParams();
  const setParams = useSetUrlParams();

  const raw = params.get(key) ?? "";
  const value = (options as readonly string[]).includes(raw) ? (raw as T) : fallback;

  const set = useCallback(
    (next: T) =>
      setParams((p) => {
        if (next === fallback) p.delete(key);
        else p.set(key, next);
      }),
    [setParams, key, fallback],
  );

  return [value, set];
}
