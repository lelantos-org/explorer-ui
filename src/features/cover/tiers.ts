import type { AnonymitySet } from "@/api";
import { type CoverTone, coverTone, THIN_SET } from "@/lib/cover";

export interface Tier {
  tone: CoverTone;
  /** The tier's name, as the legend prints it. */
  name: string;
  /** Its threshold, as the tile's label adds it. */
  bound: string;
  /** What a denomination in this tier means for the person who used it. */
  gloss: string;
  /** The tone's colour token. Reserved for cover: never reused as a series. */
  color: string;
}

/** The three readings a cohort size gets, thinnest cover first — the order the
 *  tiles, the legend and the table all use. */
export const TIERS: readonly Tier[] = [
  {
    tone: "unique",
    name: "unique",
    bound: "k = 1",
    gloss:
      "No other withdrawal published this amount. It is linkable to the deposit that funded it.",
    color: "var(--err)",
  },
  {
    tone: "thin",
    name: "thin",
    bound: `k < ${THIN_SET}`,
    gloss: "At most a handful of people — fewer, if any of them withdrew more than once.",
    color: "var(--warn)",
  },
  {
    tone: "counted",
    name: "covered",
    bound: `k ≥ ${THIN_SET}`,
    gloss: "Denominations with a real crowd behind them. These are the amounts to prefer.",
    color: "var(--ok)",
  },
];

/**
 * Denominations per tier.
 *
 * Counted over every cohort, not the rows the table keeps: the tiles are the
 * whole picture, the table is its thinnest part.
 */
export function tally(sets: readonly AnonymitySet[]): Record<CoverTone, number> {
  const counts: Record<CoverTone, number> = { unique: 0, thin: 0, counted: 0 };
  for (const s of sets) counts[coverTone(s.count)] += 1;
  return counts;
}
