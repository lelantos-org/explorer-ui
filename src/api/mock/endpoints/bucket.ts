/** Bucketing, shared by every mock endpoint that returns a time series. */

/** Floor a timestamp onto its bucket's start. */
export const bucketOf = (ts: number, bucket: number) => Math.floor(ts / bucket) * bucket;

/**
 * Fold rows into per-bucket accumulators, returned in ascending bucket order.
 *
 * Buckets with no rows are absent rather than zero-filled, matching the
 * backend: a gap in the series is a gap in the data, and the charts resolve it
 * against the requested domain rather than against the points they were given.
 */
export function bucketize<Row, Acc>(
  rows: Row[],
  bucket: number,
  tsOf: (row: Row) => number,
  init: (ts: number) => Acc,
  fold: (acc: Acc, row: Row) => void,
): Acc[] {
  const byBucket = new Map<number, Acc>();
  for (const row of rows) {
    const key = bucketOf(tsOf(row), bucket);
    let acc = byBucket.get(key);
    if (!acc) {
      acc = init(key);
      byBucket.set(key, acc);
    }
    fold(acc, row);
  }
  return [...byBucket.entries()].sort(([a], [b]) => a - b).map(([, acc]) => acc);
}
