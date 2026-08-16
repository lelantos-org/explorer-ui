export interface Range {
  label: string;
  sec: number;
  bucket: number;
}

export const RANGES: Range[] = [
  { label: "24h", sec: 86400, bucket: 3600 },
  { label: "7d", sec: 7 * 86400, bucket: 6 * 3600 },
  { label: "30d", sec: 30 * 86400, bucket: 86400 },
  { label: "90d", sec: 90 * 86400, bucket: 86400 },
];

const DEFAULT_RANGE_IDX = 2;

/** Index for a label, falling back to the default so a hand-edited URL cannot
 *  leave the page without a range. */
export function rangeIndexOf(label: string | null): number {
  const i = RANGES.findIndex((r) => r.label === label);
  return i === -1 ? DEFAULT_RANGE_IDX : i;
}
