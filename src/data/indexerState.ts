import type { Async } from "./useAsync";

/**
 * Whether the page is looking at the backend or at a memory of it.
 *
 * - `connecting` — nothing has arrived yet.
 * - `live`       — the last poll came back.
 * - `stale`      — a poll failed, but figures from an earlier one are on screen.
 * - `down`       — a poll failed and nothing has ever arrived.
 *
 * `stale` and `down` are kept apart for the same reason `useAsync` keeps loading
 * and failure apart: a page of numbers that stopped updating a minute ago is a
 * different situation from a page with no numbers at all.
 */
export type IndexerState = "connecting" | "live" | "stale" | "down";

export function indexerState({
  data,
  error,
}: Pick<Async<unknown>, "data" | "error">): IndexerState {
  if (error) return data === null ? "down" : "stale";
  return data === null ? "connecting" : "live";
}
