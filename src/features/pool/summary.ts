import type { ChainLocked } from "@/api";

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
  if (!locked) return null;
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
