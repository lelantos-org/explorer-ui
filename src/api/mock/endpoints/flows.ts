import type { CountPoint, FlowPoint, FlowQuery } from "../../types";
import type { FlowRow } from "../generate/flows";
import { bucketize } from "./bucket";

const DAY = 86400;
const HOUR = 3600;

/**
 * A flow bucket under construction. Token amounts accumulate unconditionally
 * and are dropped at the end when more than one asset is in scope, which is
 * cheaper than branching per row — and `unpriced` collects assets rather than
 * counting them, so an asset seen twice in a bucket is still one gap.
 */
interface FlowAcc {
  ts: number;
  in: number;
  out: number;
  inUsd: number | null;
  outUsd: number | null;
  unpriced: Set<number>;
}

/** The hourly rows a flow or count query reads. */
export function selectFlows(flows: FlowRow[], q: FlowQuery): FlowRow[] {
  return flows.filter(
    (r) =>
      (q.chainId === undefined || r.chainId === q.chainId) &&
      (q.assetIdU64 === undefined || r.assetIdU64 === q.assetIdU64) &&
      (q.sinceTs === undefined || r.ts >= q.sinceTs),
  );
}

/**
 * Bucketed flows, mirroring `/v1/asset-flows`.
 *
 * Token amounts exist only when exactly one asset is in scope, because amounts
 * of different tokens are not addable in any unit. Dollars are converted per
 * asset, then summed; an asset with no price counts toward `unpricedAssets`
 * instead of silently vanishing from the total.
 */
export function assetFlows(
  rows: FlowRow[],
  bucketSec: number | undefined,
  priceOf: Map<number, number | null>,
): FlowPoint[] {
  const singleAsset = new Set(rows.map((r) => r.assetIdU64)).size <= 1;
  const buckets = bucketize<FlowRow, FlowAcc>(
    rows,
    bucketSec ?? DAY,
    (r) => r.ts,
    (ts) => ({ ts, in: 0, out: 0, inUsd: null, outUsd: null, unpriced: new Set() }),
    (acc, r) => {
      acc.in += r.inAmt;
      acc.out += r.outAmt;
      const price = priceOf.get(r.assetIdU64) ?? null;
      if (price === null) {
        acc.unpriced.add(r.assetIdU64);
      } else {
        acc.inUsd = (acc.inUsd ?? 0) + r.inAmt * price;
        acc.outUsd = (acc.outUsd ?? 0) + r.outAmt * price;
      }
    },
  );
  return buckets.map((b) => ({
    ts: b.ts,
    in: singleAsset ? b.in : null,
    out: singleAsset ? b.out : null,
    inUsd: b.inUsd,
    outUsd: b.outUsd,
    unpricedAssets: b.unpriced.size,
  }));
}

/** Bucketed transaction counts, mirroring `/v1/tx-counts`. */
export function txCounts(rows: FlowRow[], bucketSec: number | undefined): CountPoint[] {
  return bucketize(
    rows,
    bucketSec ?? HOUR,
    (r) => r.ts,
    (ts) => ({ ts, count: 0 }),
    (acc, r) => {
      acc.count += r.txCount;
    },
  );
}
