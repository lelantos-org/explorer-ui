/**
 * The windows the page can be viewed over.
 *
 * A range is identified by its label everywhere — in the URL (`?range=7d`), in
 * the picker, and in the query hooks. It used to be an index into `RANGES`,
 * which meant the meaning of a stored `2` depended on the order of an array
 * three files away; a label survives reordering and reads the same in a
 * bookmarked URL as it does in code.
 */

export const RANGE_LABELS = ["24h", "7d", "30d", "90d"] as const;

export type RangeLabel = (typeof RANGE_LABELS)[number];

export interface Range {
  label: RangeLabel;
  /** Width of the window, in seconds. */
  sec: number;
  /** Width of one bucket inside it, in seconds. */
  bucket: number;
}

const DAY = 86400;
const HOUR = 3600;

const BY_LABEL: Record<RangeLabel, Range> = {
  "24h": { label: "24h", sec: DAY, bucket: HOUR },
  "7d": { label: "7d", sec: 7 * DAY, bucket: 6 * HOUR },
  "30d": { label: "30d", sec: 30 * DAY, bucket: DAY },
  "90d": { label: "90d", sec: 90 * DAY, bucket: DAY },
};

/** Every range, in picker order. */
export const RANGES: readonly Range[] = RANGE_LABELS.map((label) => BY_LABEL[label]);

export const DEFAULT_RANGE: Range = BY_LABEL["30d"];

export function isRangeLabel(value: string | null | undefined): value is RangeLabel {
  return RANGE_LABELS.some((label) => label === value);
}

/** The range a label names, falling back to the default so a hand-edited URL
 *  cannot leave the page without one. */
export function resolveRange(label: string | null | undefined): Range {
  return isRangeLabel(label) ? BY_LABEL[label] : DEFAULT_RANGE;
}
