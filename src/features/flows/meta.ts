import type { AssetOut, FlowPoint } from "@/api";
import { assetIdTag, assetLabel } from "@/domain/assets";
import { type Denom, denomLabel, hasAmounts } from "@/domain/denom";
import type { Range } from "@/domain/ranges";
import type { Scope } from "@/domain/scope";
import { joinMeta } from "@/lib/text";
import { fmtBucket } from "@/lib/time";
import type { CardMeta } from "@/ui/cardMeta";

/**
 * The window ends now, so its last bucket covers less time than the others and
 * both plots draw it faded. Said in the caption because a faded mark alone does
 * not say why.
 */
const OPEN_BUCKET = "newest bucket still filling";

/**
 * What the count-based figures cover, which is wider than the flows whenever an
 * asset is pinned: `/v1/tx-counts` and `/v1/tx-kinds` take a chain and no
 * asset. Unsaid, those read as one asset's transactions.
 */
export function countScope(scope: Scope): string | undefined {
  return scope.assetIdU64 !== null ? "all assets" : undefined;
}

/** The bucket, and the wider scope when the counts have one. */
export function countsMeta(range: Range, scope: Scope): string {
  return joinMeta([`bucket ${fmtBucket(range.bucket)}`, countScope(scope)]);
}

/**
 * Grouped, not stacked: bars are compared against each other, so the axis is
 * per-kind and not a bucket total. `pending` is a gap rather than a definition —
 * the plot is not every transaction, and a reader totalling the bars is reading
 * a number that is missing one of its four parts.
 */
export function kindsMeta(range: Range, scope: Scope): CardMeta {
  return {
    lead: joinMeta(["grouped by kind", countsMeta(range, scope)]),
    basis: OPEN_BUCKET,
    gaps: ["pending excluded"],
  };
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
): CardMeta {
  // A pinned asset is the only member of the scope. It is named by symbol or
  // address, and by the circuit id that says which registration of that token
  // is in scope — two of them can share a symbol and an address while being
  // separate anonymity sets. "unknown token" still covers the registry not
  // being loaded yet: the id alone does not say what the token is.
  const pinned = scope.assetIdU64 !== null ? scopedAssets?.[0] : undefined;
  return {
    lead: joinMeta([
      scope.assetIdU64 === null
        ? "all assets"
        : `asset ${pinned ? `${assetLabel(pinned)} ${assetIdTag(scope.assetIdU64)}` : "unknown token"}`,
      scope.chainId !== null && `chain ${scope.chainId}`,
      `bucket ${fmtBucket(range.bucket)}`,
    ]),
    // `denomLabel` decides the unit and whether it is partial, so its own
    // exclusion note travels with it rather than being re-derived here.
    // Without a common unit nothing is plotted, so there is no bucket to flag.
    basis: joinMeta([denomLabel(denom, flows), hasAmounts(denom) && OPEN_BUCKET]),
  };
}
