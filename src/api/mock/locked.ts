import type { AssetOut, ChainLocked, YieldAsset } from "../types";
import { type FlowRow, netByAsset } from "./generate";

/**
 * Biggest dollar balance first, with the unpriced trailing.
 *
 * An unpriced balance has no place on a dollar scale, so it sorts last rather
 * than as a zero, which would rank it worthless instead of unknown.
 */
const richestFirst = (a: number | null, b: number | null) =>
  (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);

/**
 * Escrowed balances per chain, mirroring `/v1/locked`: all-time deposits minus
 * withdrawals per asset, summed across a chain's assets only in dollars — the
 * one unit they share. An unpriced asset keeps its token amount and counts
 * toward `unpricedAssets` rather than vanishing from the total.
 *
 * Assets that never moved are absent, as they are in the view the endpoint
 * reads: it aggregates flows, so an asset with none has no row.
 *
 * `yields` plays the part the endpoint's join to `asset_yield` plays. A yield
 * asset's balance is what its venue holds, not what flowed: growth fires no
 * event, so `in − out` misses everything ever earned. Taking the two from one
 * source here is what stops the escrow card and the yield card disagreeing about
 * the same asset — which they would, silently, if each derived its own.
 */
export function lockedByChain(
  assets: AssetOut[],
  flows: FlowRow[],
  yields: YieldAsset[] = [],
): ChainLocked[] {
  const totals = netByAsset(flows);
  const byChain = new Map<number, ChainLocked>();
  // Only a polled row can supply a balance; a bound-but-unpolled asset falls
  // back to its flows, exactly as the endpoint's `LEFT JOIN` does when `gross`
  // is still NULL.
  const gross = new Map(
    yields.filter((y) => y.gross !== null).map((y) => [y.assetIdU64, y.gross as number]),
  );

  for (const asset of assets) {
    const total = totals.get(asset.assetIdU64);
    if (!total) continue;

    const held = gross.get(asset.assetIdU64);
    const amount = held ?? total.net;
    const basis = held === undefined ? "flowDifference" : "venueHoldings";
    const lockedUsd = asset.priceUsd === null ? null : amount * asset.priceUsd;
    const chain = byChain.get(asset.chainId) ?? {
      chainId: asset.chainId,
      lockedUsd: null,
      unpricedAssets: 0,
      assets: [],
    };
    if (lockedUsd === null) chain.unpricedAssets += 1;
    else chain.lockedUsd = (chain.lockedUsd ?? 0) + lockedUsd;

    chain.assets.push({
      assetIdU64: asset.assetIdU64,
      tokenHex: asset.tokenHex,
      symbol: asset.symbol,
      amount,
      lockedUsd,
      lastTs: total.lastTs,
      basis,
    });
    byChain.set(asset.chainId, chain);
  }

  for (const chain of byChain.values()) {
    chain.assets.sort(
      (a, b) => richestFirst(a.lockedUsd, b.lockedUsd) || a.assetIdU64 - b.assetIdU64,
    );
  }
  return [...byChain.values()].sort(
    (a, b) => richestFirst(a.lockedUsd, b.lockedUsd) || a.chainId - b.chainId,
  );
}
