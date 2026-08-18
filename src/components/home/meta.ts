/**
 * The caption line under each card's title.
 *
 * They live together because they answer one question in four places: what the
 * figures above them actually cover. Each is a pure function of already-loaded
 * data, so what a card claims can be tested without rendering it.
 */
import type { AssetOut, FlowPoint } from "../../api";
import type { ChainsSummary, LockedSummary } from "../../lib/aggregate";
import { assetLabel } from "../../lib/assets";
import { type Denom, denomLabel, USD_AT_SPOT } from "../../lib/denom";
import { fmtBucket, fmtNum, fmtUsd, joinMeta } from "../../lib/format";
import type { Range } from "../../lib/ranges";
import type { Scope } from "../../lib/scope";

export const LOADING = "loading…";

/** "1 unpriced asset" / "3 unpriced assets", or nothing when none are. */
const unpricedNote = (count: number): string | false =>
  count > 0 && `${count} unpriced asset${count === 1 ? "" : "s"} excluded`;

/**
 * What the count-based cards cover, which is wider than the flow cards whenever
 * an asset is pinned: `/v1/tx-counts` and `/v1/tx-kinds` take a chain and no
 * asset. Unsaid, those cards read as one asset's transactions.
 */
export function countScope(scope: Scope): string | undefined {
  return scope.assetIdU64 !== null ? "all assets" : undefined;
}

export function countsMeta(range: Range, scope: Scope): string {
  return joinMeta([`bucket ${fmtBucket(range.bucket)}`, countScope(scope)]);
}

/**
 * Grouped, not stacked: bars are compared against each other, so the axis is
 * per-kind and not a bucket total. `pending` is named as excluded rather than
 * silently dropped — the plot is not every transaction, and a reader totalling
 * the bars should know that.
 */
export function kindsMeta(range: Range, scope: Scope): string {
  return joinMeta(["grouped by kind", "pending excluded", countsMeta(range, scope)]);
}

export function chainsMeta(summary: ChainsSummary | null): string {
  if (!summary) return LOADING;
  // inflow/outflow are reserved backend fields, still zero today — omit them
  // rather than render 0 as a measurement.
  const { chains, hasValues, inflow, outflow, tx } = summary;
  return joinMeta([
    `${chains} chains`,
    hasValues && `in ${fmtNum(inflow)}`,
    hasValues && `out ${fmtNum(outflow)}`,
    `${fmtNum(tx)} tx`,
  ]);
}

/**
 * Name the unit rather than leaving the reader to guess. Token amounts are
 * per-asset, dollars are the only cross-asset value, and a partial dollar total
 * says how much it is leaving out.
 */
export function flowMeta(
  scope: Scope,
  range: Range,
  denom: Denom,
  flows: FlowPoint[] | null,
  scopedAssets: AssetOut[] | null,
): string {
  // A pinned asset is the only member of the scope. It is named by symbol or
  // address; "unknown token" covers the registry not being loaded yet, which the
  // registry id would only paper over.
  const pinned = scope.assetIdU64 !== null ? scopedAssets?.[0] : undefined;
  return joinMeta([
    scope.assetIdU64 === null
      ? "all assets"
      : `asset ${pinned ? assetLabel(pinned) : "unknown token"}`,
    denomLabel(denom, flows),
    scope.chainId !== null && `chain ${scope.chainId}`,
    `bucket ${fmtBucket(range.bucket)}`,
  ]);
}

/**
 * The escrow card's own caveat line: what the network holds, and what that
 * figure is leaving out. A chain whose assets are all unpriced contributes
 * nothing to the total, so the count of excluded assets travels with it.
 */
export function lockedMeta(summary: LockedSummary | null): string {
  if (!summary) return LOADING;
  if (summary.chains === 0) return "nothing escrowed";
  const { chains, totalUsd, unpricedAssets } = summary;
  return joinMeta([
    totalUsd === null
      ? `${chains} chains · no usable prices`
      : `${fmtUsd(totalUsd)} across ${chains} chains`,
    `deposits − withdrawals · ${USD_AT_SPOT}`,
    unpricedNote(unpricedAssets),
  ]);
}
