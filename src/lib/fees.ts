import type { AssetOut } from "../api";

/** Basis-points denominator, matching `FeeConfig.BPS_DENOMINATOR` on chain. */
const BPS_DENOMINATOR = 10_000;

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

/**
 * Percent form of a bps rate.
 *
 * Rates are capped at `MAX_FEE_BPS` (2000 = 20%) on chain and are usually two
 * digits, so two decimals is enough to separate 20 bps (0.2%) from 25 (0.25%)
 * without padding every row with zeroes.
 */
function fmtBps(bps: number): string {
  const pct = (bps / BPS_DENOMINATOR) * 100;
  return `${Number(pct.toFixed(2))}%`;
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
