import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type PollerEnv, startPoller } from "./poller";

const INTERVAL = 30_000;

/** A page whose visibility the test controls. */
function fakePage() {
  let hidden = false;
  const listeners = new Set<() => void>();
  const env: PollerEnv = {
    now: () => Date.now(),
    isHidden: () => hidden,
    onVisible: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  return {
    env,
    hide: () => {
      hidden = true;
    },
    show: () => {
      hidden = false;
      for (const l of listeners) l();
    },
    listeners,
  };
}

/** A fetch whose responses the test settles by hand. */
function manualFetch<T>() {
  const pending: { resolve: (v: T) => void; reject: (e: unknown) => void }[] = [];
  const fetch = vi.fn(() => new Promise<T>((resolve, reject) => pending.push({ resolve, reject })));
  return { fetch, pending };
}

/** Let settled promises run their callbacks. */
const flush = () => Promise.resolve().then(() => Promise.resolve());

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("startPoller", () => {
  it("requests at once, then on every interval", async () => {
    const page = fakePage();
    const fetch = vi.fn(async () => 1);
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await flush();
    vi.advanceTimersByTime(INTERVAL);
    expect(fetch).toHaveBeenCalledTimes(2);
    stop();
  });

  it("requests once and never again without an interval", async () => {
    const fetch = vi.fn(async () => 1);
    startPoller({ fetch, onData: () => {}, onError: () => {}, env: fakePage().env });
    await flush();
    vi.advanceTimersByTime(INTERVAL * 3);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not poll a hidden page", async () => {
    const page = fakePage();
    const fetch = vi.fn(async () => 1);
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    await flush();
    page.hide();
    vi.advanceTimersByTime(INTERVAL * 3);
    expect(fetch).toHaveBeenCalledTimes(1);
    stop();
  });

  it("catches up at once when the page returns after a poll fell due", async () => {
    const page = fakePage();
    const fetch = vi.fn(async () => 1);
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    await flush();
    page.hide();
    vi.advanceTimersByTime(INTERVAL + 1);
    page.show();
    expect(fetch).toHaveBeenCalledTimes(2);
    stop();
  });

  it("does not refetch on return when the data is still fresh", async () => {
    const page = fakePage();
    const fetch = vi.fn(async () => 1);
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    await flush();
    page.hide();
    vi.advanceTimersByTime(INTERVAL / 3);
    page.show();
    expect(fetch).toHaveBeenCalledTimes(1);
    stop();
  });

  it("skips a tick while the previous request is still in flight", () => {
    const page = fakePage();
    const { fetch } = manualFetch<number>();
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    vi.advanceTimersByTime(INTERVAL * 2);
    expect(fetch).toHaveBeenCalledTimes(1);
    stop();
  });

  it("drops a response that lands after stop", async () => {
    const { fetch, pending } = manualFetch<number>();
    const onData = vi.fn();
    const onError = vi.fn();
    const stop = startPoller({ fetch, onData, onError, intervalMs: INTERVAL, env: fakePage().env });
    stop();
    pending[0]?.resolve(42);
    await flush();
    expect(onData).not.toHaveBeenCalled();
  });

  it("reports a failure as a message and keeps polling", async () => {
    const page = fakePage();
    const fetch = vi.fn(async () => {
      throw new Error("503 service unavailable");
    });
    const onError = vi.fn();
    const stop = startPoller({
      fetch,
      onData: () => {},
      onError,
      intervalMs: INTERVAL,
      env: page.env,
    });
    await flush();
    expect(onError).toHaveBeenCalledWith("503 service unavailable");
    vi.advanceTimersByTime(INTERVAL);
    expect(fetch).toHaveBeenCalledTimes(2);
    stop();
  });

  it("unsubscribes from visibility on stop", () => {
    const page = fakePage();
    const stop = startPoller({
      fetch: async () => 1,
      onData: () => {},
      onError: () => {},
      intervalMs: INTERVAL,
      env: page.env,
    });
    expect(page.listeners.size).toBe(1);
    stop();
    expect(page.listeners.size).toBe(0);
  });
});
