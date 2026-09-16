import type { AssetOut } from "@/api/types";
import { fmtBps } from "@/lib/format";

/**
 * The three states a rate can be in, and the only place they are decided.
 *
 * They exist because the pool has no global fee to fall back on: every asset
 * carries its own pair, so a missing value means the indexer has not seen an
 * `AssetFeeSet` for it — unknown — while `0` is a real, deliberate zero-rate
 * leg. Rendering the unknown one as "0%" would claim a free asset that may
 * charge.
 */
export type FeeState = "charged" | "free" | "unknown";

export interface FeeDisplay {
  /** Which of the three; callers key both copy and styling off this. */
  state: FeeState;
  /** What to print. */
  text: string;
  /** Tooltip: the exact bps, or why there is no number. */
  title: string;
}

export function feeDisplay(bps: number | null): FeeDisplay {
  if (bps === null) {
    return { state: "unknown", text: "—", title: "not indexed yet — unknown, not zero" };
  }
  if (bps === 0) {
    // Spelled out rather than "0%": a zero rate is a deliberate configuration
    // here, and the word says so where a number reads like a missing value.
    return { state: "free", text: "free", title: "0 bps — this leg charges nothing" };
  }
  return { state: "charged", text: fmtBps(bps), title: `${bps} bps` };
}

/**
 * Whether either leg is still unindexed.
 *
 * An asset with an unknown leg is one a wallet cannot quote a shield for, so
 * this is the registry's own measure of how far behind the indexer is — worth
 * counting separately from a missing price, which costs nobody anything.
 */
export function hasUnknownFee(asset: Pick<AssetOut, "depositBps" | "withdrawBps">): boolean {
  return asset.depositBps === null || asset.withdrawBps === null;
}
