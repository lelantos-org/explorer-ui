/**
 * A failed request, in the reader's terms.
 *
 * The error a query hook carries is transport text — "500 Internal Server
 * Error", "Failed to fetch" — which says what broke to whoever runs the
 * backend and nothing to whoever is reading the page. This turns it into what
 * the reader can act on: whether the problem is on their side or ours, and that
 * the page recovers on its own.
 */
export interface Failure {
  /** What went wrong, without status codes. */
  headline: string;
  /** What happens next. Every query polls, so there is nothing to click. */
  hint: string;
}

/** The HTTP client's `${status} ${statusText}`. */
const STATUS = /^(\d{3})\b/;

/**
 * The network-level rejections `fetch` throws, which differ per engine:
 * Chromium, Node, Firefox and Safari, React Native.
 */
const OFFLINE = /failed to fetch|fetch failed|networkerror|load failed|network request failed/i;

export function describeFailure(raw: string): Failure {
  if (OFFLINE.test(raw)) {
    return {
      headline: "can't reach the explorer",
      hint: "check your connection — this will load on its own once you're back online",
    };
  }

  const status = Number(STATUS.exec(raw)?.[1]);
  if (status === 429 || status >= 500) {
    return {
      headline: "the explorer is having trouble right now",
      hint: "this will load on its own once it recovers, no need to refresh",
    };
  }

  return {
    headline: "this section didn't load",
    hint: "we'll keep trying in the background",
  };
}
