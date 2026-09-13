/**
 * The polling engine behind `useAsync`, with no React in it.
 *
 * Kept framework-free so its timing rules — the ones that decide how hard the
 * page leans on the backend — can be tested with fake timers rather than only
 * observed in a browser.
 */

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : "request failed");

/** The browser APIs the poller depends on, injectable for tests. */
export interface PollerEnv {
  now: () => number;
  /** Whether the page is in a background tab. */
  isHidden: () => boolean;
  /** Subscribe to the page becoming visible again; returns an unsubscribe. */
  onVisible: (listener: () => void) => () => void;
}

const browserEnv: PollerEnv = {
  now: () => Date.now(),
  isHidden: () => typeof document !== "undefined" && document.visibilityState === "hidden",
  onVisible: (listener) => {
    if (typeof document === "undefined") return () => {};
    const handler = () => {
      if (document.visibilityState === "visible") listener();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  },
};

export interface PollerOptions<T> {
  fetch: () => Promise<T>;
  onData: (data: T) => void;
  onError: (message: string) => void;
  /** Poll interval in ms. Omitted, the request runs once. */
  intervalMs?: number;
  env?: PollerEnv;
}

/**
 * Run `fetch` now, and then every `intervalMs`. Returns `stop`.
 *
 * - **Hidden tabs do not poll.** Nobody reads a background tab. When it comes
 *   back, a poll that fell due while it was hidden runs at once, so the page
 *   never shows figures older than one interval once it is looked at again.
 * - **No pile-up.** A tick is skipped while the previous request is still in
 *   flight, so a slow backend is not handed a second copy of every query.
 * - **Nothing after stop.** A response that lands after `stop` is dropped, so
 *   an answer for filters the reader has since changed can never overwrite the
 *   answer for the current ones.
 */
export function startPoller<T>({
  fetch,
  onData,
  onError,
  intervalMs,
  env = browserEnv,
}: PollerOptions<T>): () => void {
  let stopped = false;
  let inFlight = false;
  let lastStarted = Number.NEGATIVE_INFINITY;

  const request = () => {
    if (inFlight || stopped) return;
    inFlight = true;
    lastStarted = env.now();
    fetch().then(
      (data) => {
        inFlight = false;
        if (!stopped) onData(data);
      },
      (e: unknown) => {
        inFlight = false;
        if (!stopped) onError(messageOf(e));
      },
    );
  };

  request();
  if (!intervalMs) {
    return () => {
      stopped = true;
    };
  }

  const id = setInterval(() => {
    if (!env.isHidden()) request();
  }, intervalMs);
  const unsubscribe = env.onVisible(() => {
    if (env.now() - lastStarted >= intervalMs) request();
  });

  return () => {
    stopped = true;
    clearInterval(id);
    unsubscribe();
  };
}
