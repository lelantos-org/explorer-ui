/**
 * A card's caption, in three tiers.
 *
 * The split is by what a reader does with each part, not by length:
 *
 * - `lead` — the figure. What the card counts, and how much of it there is.
 * - `basis` — the definition. What that figure means, and the caveats that
 *   change how it should be read. Present only where the number is open to
 *   being misread; most cards need none.
 * - `gaps` — what the figure leaves out or flags. The actionable part: assets
 *   missing from a total, cohorts below a safe size, fields the indexer has not
 *   resolved. Rendered in the warn tone so it can be scanned without reading.
 *
 * Flattened into a single `·` chain the three read at identical weight, so
 * "what this measures" is indistinguishable from "what is missing from it" —
 * and the second is the part a reader has to act on.
 *
 * Each feature builds its captions in a `meta.ts` beside it, as pure functions
 * of already-loaded data, so what a card claims can be tested without
 * rendering it. `ui/Meta` renders them.
 */
export interface CardMeta {
  lead: string;
  basis?: string;
  gaps?: string[];
  /** The data behind the caption has not arrived: `ui/Meta` draws a
   *  placeholder line in its place, with `lead` read to assistive tech. */
  pending?: boolean;
}

export const LOADING: CardMeta = { lead: "loading…", pending: true };

/** Drop the empties, for a gap list that is mostly conditional. */
export const gapList = (...values: (string | false | undefined)[]): string[] =>
  values.filter((v): v is string => Boolean(v));
