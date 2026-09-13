import type { AssetOut, FlowPoint } from "@/api";
import { assetIdTag, assetLabel } from "@/lib/assets";
import { type Denom, denomLabel } from "@/lib/denom";
import { fmtBucket, joinMeta } from "@/lib/format";
import type { Range } from "@/lib/ranges";
import type { Scope } from "@/lib/scope";
import type { CardMeta } from "@/ui/cardMeta";

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
    basis: denomLabel(denom, flows),
  };
}
