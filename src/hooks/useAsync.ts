import { useEffect, useRef, useState } from "react";

/**
 * A request's full state. Every data hook returns this shape, so no caller has
 * to guess whether an empty result means "still loading", "nothing there" or
 * "the backend is down" — the three used to be indistinguishable wherever a
 * failure was swallowed into `[]`.
 */
export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface AsyncOpts {
  /** Poll interval in ms. Omit for a single fetch. */
  refetchMs?: number;
}

const IDLE: Async<never> = { data: null, loading: true, error: null };

const messageOf = (e: unknown) => (e instanceof Error ? e.message : "request failed");

/**
 * Run `fn` whenever `deps` change, and optionally on an interval.
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
    let alive = true;

    const request = () => {
      fnRef.current().then(
        (data) => {
          if (alive) setState({ data, loading: false, error: null });
        },
        (e: unknown) => {
          // Keep whatever was on screen: a failed refresh should not blank the
          // page, and the error field says the figures are stale.
          if (alive) setState((s) => ({ data: s.data, loading: false, error: messageOf(e) }));
        },
      );
    };

    // A new query reads as a fresh load; a poll refreshes underneath whatever
    // is already on screen, so it never flashes the page back to a spinner.
    setState((s) => ({ data: s.data, loading: true, error: null }));
    request();

    if (!refetchMs) {
      return () => {
        alive = false;
      };
    }
    const id = setInterval(request, refetchMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [...deps, refetchMs]);

  return state;
}
