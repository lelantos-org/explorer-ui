/** Value and activity over time: flow buckets, counts, and the 24h chain summary. */

export interface FlowPoint {
  ts: number;
  /**
   * Whole tokens, present only when exactly one asset is in scope (pin one
   * with `assetIdU64`). null otherwise: amounts of different tokens are not
   * addable in any unit, so there is no cross-asset token total.
   */
  in: number | null;
  out: number | null;
  /**
   * USD across the assets that could be priced. null = nothing in the bucket
   * had a price. A non-zero `unpricedAssets` means these cover only part of
   * the volume in `in`/`out`.
   */
  inUsd: number | null;
  outUsd: number | null;
  unpricedAssets: number;
}

export interface CountPoint {
  ts: number;
  count: number;
}

export interface ChainFlow {
  chainId: number;
  inflow: number;
  outflow: number;
  hourlyIn: number[];
  hourlyOut: number[];
  txCount: number;
}

export interface FlowQuery {
  chainId?: number;
  assetIdU64?: number;
  bucketSec?: number;
  sinceTs?: number;
}

export interface CountQuery {
  chainId?: number;
  bucketSec?: number;
  sinceTs?: number;
}
