import type { AnonymitySet } from "@/api";
import { thinnestFirst } from "@/domain/cover";

/**
 * How many rows the card shows.
 *
 * The full set is fetched — the feed's privacy column joins against all of it —
 * but a pool used off-ladder produces a denomination per withdrawal, and
 * hundreds of rows of k=1 is a scroll, not a finding. Thinnest-first means the
 * ones worth acting on are the ones that survive the cut, and the footer says
 * how many did not.
 */
export const VISIBLE_ROWS = 12;

/**
 * How wide a row's bar is, as a share of the widest cohort on screen.
 *
 * Linear, deliberately. A log scale would make a cohort of 2 look comparable to
 * one of 200, which is the exact comparison this card exists to make legible.
 * A floor keeps the thinnest sets visible rather than collapsing them to a line
 * indistinguishable from zero.
 */
const MIN_FILL = 2;
export const fill = (count: number, max: number): number =>
  Math.max(MIN_FILL, (count / Math.max(1, max)) * 100);

export interface VisibleCohorts {
  /** The thinnest cohorts, at most `VISIBLE_ROWS` of them. */
  rows: AnonymitySet[];
  /** How many were left off. */
  hidden: number;
  /**
   * The widest cohort drawn, which the bars are scaled against — not the widest
   * in the data: a busy rung left off the card would otherwise flatten every
   * visible bar against a maximum the reader cannot see.
   */
  max: number;
}

/** The rows the card draws, thinnest first, and what the cut leaves out. */
export function visibleCohorts(data: readonly AnonymitySet[] | null): VisibleCohorts {
  const sorted = [...(data ?? [])].sort(thinnestFirst);
  const rows = sorted.slice(0, VISIBLE_ROWS);
  return {
    rows,
    hidden: sorted.length - rows.length,
    max: Math.max(1, ...rows.map((r) => r.count)),
  };
}
