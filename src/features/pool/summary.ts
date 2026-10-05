import type { ChainLocked, LockedAsset } from "@/api";
import type { Scope } from "@/domain/scope";

export interface LockedSummary {
  chains: number;
  /** Network-wide escrow in dollars. null when nothing anywhere could be
   *  priced, which is not the same as an empty pool. */
  totalUsd: number | null;
  /** Assets excluded from `totalUsd` for want of a price, across every chain. */
  unpricedAssets: number;
  /**
   * Assets whose balance is what the venue holds rather than what flowed.
   *
   * Counted because it changes what the total *means*: with any of these in it,
   * the headline is no longer "deposits minus withdrawals" — yield fires no
   * flow, so that definition would understate them by everything ever earned.
   */
  venueHeldAssets: number;
}

/**
 * Total the escrowed balances the way the per-chain figures were built: dollars
 * only, and counting what they leave out.
 *
 * Summing the chains' own `lockedUsd` rather than their assets keeps one rule in
 * one place — the backend already decided which assets it could price.
 */
export function summarizeLocked(locked: ChainLocked[] | null): LockedSummary | null {
  return locked && totalLocked(locked);
}

function totalLocked(locked: ChainLocked[]): LockedSummary {
  let totalUsd: number | null = null;
  let unpricedAssets = 0;
  let venueHeldAssets = 0;
  for (const c of locked) {
    if (c.lockedUsd !== null) totalUsd = (totalUsd ?? 0) + c.lockedUsd;
    unpricedAssets += c.unpricedAssets;
    venueHeldAssets += c.assets.filter((a) => a.basis === "venueHoldings").length;
  }
  return { chains: locked.length, totalUsd, unpricedAssets, venueHeldAssets };
}

export interface HeldReading {
  /** Whole tokens when one asset is pinned, dollars otherwise: balances of
   *  different tokens add up in no other unit. */
  unit: "tokens" | "usd";
  /** null = unknown — unresolved decimals, no usable price, or an asset the
   *  escrow has no row for. Never zero. */
  value: number | null;
  /** Assets a dollar figure leaves out for want of a price. */
  unpricedAssets: number;
}

/** What the pool holds right now within a scope, for the headline tile. */
export function heldInScope(locked: ChainLocked[] | null, scope: Scope): HeldReading | null {
  if (!locked) return null;
  const chains =
    scope.chainId === null ? locked : locked.filter((c) => c.chainId === scope.chainId);
  if (scope.assetIdU64 !== null) {
    const asset = chains.flatMap((c) => c.assets).find((a) => a.assetIdU64 === scope.assetIdU64);
    return { unit: "tokens", value: asset?.amount ?? null, unpricedAssets: 0 };
  }
  const { totalUsd, unpricedAssets } = totalLocked(chains);
  return { unit: "usd", value: totalUsd, unpricedAssets };
}

/**
 * An asset's fraction of the network's priced escrow.
 *
 * null wherever a fraction would not mean one: the asset or the pool has no
 * price, the pool nets to nothing, or the balance is negative — missed deposits
 * are not a holding.
 */
export function assetShare(asset: LockedAsset, totalUsd: number | null): number | null {
  if (asset.lockedUsd === null || asset.lockedUsd < 0) return null;
  if (totalUsd === null || totalUsd <= 0) return null;
  return asset.lockedUsd / totalUsd;
}
