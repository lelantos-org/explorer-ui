/**
 * Build-time configuration, read in one place.
 *
 * `import.meta.env` values are always strings or absent — Vite substitutes them
 * textually — so every flag needs the same "1 or true" reading. Doing that at
 * each use site is how one call site ends up accepting `true` and another only
 * `1`.
 */

const isEnabled = (value: string | undefined): boolean => value === "1" || value === "true";

export interface Config {
  /** Prefix for API paths. Empty means same-origin, which is what the dev
   *  server's proxy and the production nginx config both serve. */
  apiBase: string;
  /** Serve the generated dataset instead of a backend; see `api/mock`. */
  useMock: boolean;
}

export const config: Config = {
  apiBase: import.meta.env.VITE_API_BASE ?? "",
  useMock: isEnabled(import.meta.env.VITE_USE_MOCK),
};

/**
 * How often the page re-reads the backend, in ms.
 *
 * Every series refreshes on the same interval, so no two cards can drift into
 * describing different moments — a chart and the tiles above it disagreeing is
 * worse than both being a little stale. Here rather than beside the queries
 * because the UI names it too: the filter bar's refresh stamp.
 */
export const REFRESH_MS = 30_000;
