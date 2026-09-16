/**
 * How much cover a withdrawal cohort gives.
 *
 * A withdrawal publishes exactly one integer, its `publicOut`, so its anonymity
 * set is every other withdrawal that published the same one. See
 * `docs/src/guide/denominations.md`: the set is *actual, not potential* — it is
 * however many users withdrew that denomination, not however many could have.
 *
 * Pure functions of already-loaded data, so what a cohort claims can be tested
 * without rendering it. What a single feed row reports is `domain/txPrivacy`.
 */
import type { AnonymitySet } from "@/api/types";

/**
 * Below this many withdrawals, a denomination is called thin.
 *
 * A display threshold chosen for this UI, not a protocol value: nothing on
 * chain treats 9 differently from 10. It exists so a cohort that is technically
 * more than one, but still small enough to enumerate by hand, does not render
 * with the same confidence as a busy rung.
 */
export const THIN_SET = 10;

/**
 * The lookback behind every "recent" figure on the cohort card.
 *
 * Lives here rather than beside the query because the request and the label
 * that names it have to agree: a constant in the hook and a "30d" written into
 * a caption are the same number in two places, and the first time either moves
 * the card starts lying. `fmtBucket` renders it, so the label is derived too.
 *
 * Deliberately not the page's range selector. `count` is all-history by
 * definition, and a recency figure that followed the range would read as though
 * the whole card did.
 */
export const RECENT_WINDOW_SEC = 30 * 86_400;

/**
 * How many cohorts the page asks for — the backend's own maximum page.
 *
 * These rows are a lookup table as much as a list: the feed joins every
 * withdrawal against them to report its k, so a page that stopped short leaves
 * the rows past the cut reporting an unknown cohort. Off-ladder withdrawals
 * each make a denomination of their own, so the row count tracks how *unlike* a
 * ladder the pool's usage is rather than the ladder's size.
 *
 * Lives here, like the window, because the interpretation depends on it: a
 * response *at* the cap may have been truncated, and a denomination missing
 * from a truncated list means something different from one missing from a
 * complete one.
 */
export const COHORT_LIMIT = 1000;

/**
 * How much cover a cohort of a given size provides.
 *
 * - `counted` — a real cohort, at or above `THIN_SET`.
 * - `thin` — more than one, but small enough to enumerate by hand.
 * - `unique` — a cohort of one. No cover: the amount links this withdrawal to
 *   the deposit that funded it.
 */
export type CoverTone = "counted" | "thin" | "unique";

/**
 * Which reading a cohort size gets.
 *
 * The feed's privacy column and the cohort card both need this, and a UI where
 * a row reads "thin" beside a bar coloured as healthy would be worse than
 * either alone — so the decision lives here once rather than in each of them.
 */
export function coverTone(count: number): CoverTone {
  if (count <= 1) return "unique";
  return count < THIN_SET ? "thin" : "counted";
}

/**
 * Whether a cohort has seen any activity inside the requested window.
 *
 * Reported alongside the tone rather than folded into it. A dormant cohort's
 * `count` is real and the definition of an anonymity set is all-history, so a
 * busy-but-old denomination is not thin — it is busy and old, and saying so
 * takes two facts rather than one relabelled one.
 *
 * A `null` recency is unknown, not dormant: a backend too old to report the
 * window has not told us the cohort went quiet, and saying it did would invent
 * a finding.
 */
export const isDormant = (set: AnonymitySet): boolean => set.recentCount === 0;

/**
 * How a cohort size reads.
 *
 * A bare "k = 1" looks like a small number on a scale. It is not on the scale:
 * it means no cover at all, so it is named rather than counted. Larger counts
 * are exact rather than abbreviated — `fmtNum` would render 1234 as "1.2k",
 * both the wrong convention for a count of things and a confusing second "k".
 */
export function kLabel(count: number): string {
  return count <= 1 ? "k = 1 · unique" : `k = ${count.toLocaleString()}`;
}

/** Cohorts smallest first, so the thinnest sets — the ones worth acting on —
 *  lead. Ties break on the denomination so the order is stable between
 *  requests, comparing numerically since "1000" sorts below "200" as text. */
export function thinnestFirst(a: AnonymitySet, b: AnonymitySet): number {
  return a.count - b.count || Number(a.publicOut) - Number(b.publicOut);
}
