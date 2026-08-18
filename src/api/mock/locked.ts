import type { AssetOut, ChainLocked } from "../types";
import type { FlowRow } from "./generate";

/**
 * Biggest dollar balance first, with the unpriced trailing.
 *
 * An unpriced balance has no place on a dollar scale, so it sorts last rather
 * than as a zero, which would rank it worthless instead of unknown.
 */
const richestFirst = (a: number | null, b: number | null) =>
  (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);

/** Net escrowed amount per asset, and when it last moved. */
function netByAsset(flows: FlowRow[]): Map<number, { net: number; lastTs: number }> {
  const totals = new Map<number, { net: number; lastTs: number }>();
  for (const f of flows) {
    const t = totals.get(f.assetIdU64) ?? { net: 0, lastTs: 0 };
    t.net += f.inAmt - f.outAmt;
    t.lastTs = Math.max(t.lastTs, f.ts);
    totals.set(f.assetIdU64, t);
  }
  return totals;
}

/**
 * Escrowed balances per chain, mirroring `/v1/locked`: all-time deposits minus
 * withdrawals per asset, summed across a chain's assets only in dollars — the
 * one unit they share. An unpriced asset keeps its token amount and counts
 * toward `unpricedAssets` rather than vanishing from the total.
 *
 * Assets that never moved are absent, as they are in the view the endpoint
 * reads: it aggregates flows, so an asset with none has no row.
 */
export function lockedByChain(assets: AssetOut[], flows: FlowRow[]): ChainLocked[] {
  const totals = netByAsset(flows);
  const byChain = new Map<number, ChainLocked>();

  for (const asset of assets) {
    const total = totals.get(asset.assetIdU64);
    if (!total) continue;

    const lockedUsd = asset.priceUsd === null ? null : total.net * asset.priceUsd;
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
      amount: total.net,
      lockedUsd,
      lastTs: total.lastTs,
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
