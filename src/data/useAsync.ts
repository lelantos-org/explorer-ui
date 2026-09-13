import { useEffect, useRef, useState } from "react";
import { replaceEqualDeep } from "@/lib/replaceEqualDeep";
import { startPoller } from "./poller";

/**
 * A request's full state. Every data hook returns this shape, so no caller has
 * to guess whether an empty result means "still loading", "nothing there" or
 * "the backend is down" — the three used to be indistinguishable wherever a
 * failure was swallowed into `[]`.
 */
export interface Async<T> {
  data: T | null;
  /**
   * A request for the current `deps` is in flight. True on the first load and
   * again whenever the deps change — a new range, a new chain — but not for a
   * background poll, which refreshes underneath what is on screen. With `data`
   * still set, it means the figures shown belong to the previous deps.
   */
  loading: boolean;
  error: string | null;
  /**
   * When `data` last arrived, in epoch ms; `null` until it first does.
   *
   * Kept through a failed refresh, like `data` itself: the figures on screen
   * are still the ones that landed then, and "refreshed 3m ago" is the honest
   * thing to say about them.
   */
  updatedAt: number | null;
}

export interface AsyncOpts {
  /** Poll interval in ms. Omit for a single fetch. */
  refetchMs?: number;
}

const IDLE: Async<never> = { data: null, loading: true, error: null, updatedAt: null };

/**
 * Run `fn` whenever `deps` change, and optionally on an interval.
 *
 * The timing rules — hidden tabs, pile-up, late responses — are `startPoller`'s.
 * This hook owns only the state: each response is merged into the previous one
 * with `replaceEqualDeep`, so an unchanged poll hands back the same references
 * and memoised components below skip their render.
 *
 * `deps` is the caller's own dependency list rather than `fn`, which is a fresh
 * closure on every render. The latest `fn` is held in a ref so a poll always
 * calls current code without the interval restarting each render.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], opts: AsyncOpts = {}): Async<T> {
  const { refetchMs } = opts;
  const [state, setState] = useState<Async<T>>(IDLE);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    // A new query reads as a fresh load; a poll refreshes underneath whatever
    // is already on screen, so it never flashes the page back to a skeleton.
    setState((s) => (s.loading && s.error === null ? s : { ...s, loading: true, error: null }));

    return startPoller({
      fetch: () => fnRef.current(),
      intervalMs: refetchMs,
      onData: (data) =>
        setState((s) => ({
          data: replaceEqualDeep(s.data, data),
          loading: false,
          error: null,
          updatedAt: Date.now(),
        })),
      // Keep whatever was on screen: a failed refresh should not blank the
      // page, and the error field says the figures are stale.
      onError: (error) => setState((s) => ({ ...s, loading: false, error })),
    });
  }, [...deps, refetchMs]);

  return state;
}
