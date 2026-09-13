import type { YieldAsset } from "@/api/types";

/**
 * The scale `indexRay` is expressed in, matching the pool's own RAY.
 *
 * The index starts at exactly one RAY when a venue is bound and only moves as
 * the venue earns, which is what makes `ratio - 1` a return rather than an
 * arbitrary offset.
 */
const RAY = 1e27;

/**
 * The conversion rate as a plain multiplier — 1.0342 for an asset up 3.42%.
 *
 * The string is parsed here and nowhere else. `Number` keeps ~15 significant
 * digits where `indexRay` carries 28, so this is lossy by construction; that is
 * acceptable because the result is only ever *printed*, to four decimals at
 * most, and the digits it drops are far below anything a display shows.
 *
 * Nothing derives an amount from this. Amounts come from `gross` and
 * `accruedFee`, which the backend converts with the contract's own arithmetic —
 * rebuilding one from a rounded index disagrees with the contract at the
 * boundary.
 */
export function indexRatio(indexRay: string | null): number | null {
  if (indexRay === null) return null;
  const n = Number(indexRay);
  // A malformed string parses to NaN, which would otherwise flow into the
  // formatters and print "NaN%" where the value is simply not known.
  return Number.isFinite(n) ? n / RAY : null;
}

/**
 * Total growth since the venue was bound, as a fraction — 0.0342 for +3.42%.
 *
 * **Not an APY, and deliberately not presented as one.** Nothing in the row
 * records when the binding was created, and there is no history of the index to
 * fit a rate to: the backend stores one current value per asset and overwrites
 * it every poll. Annualising a lifetime return without knowing the lifetime
 * would overstate a young asset wildly and understate an old one, so this is
 * reported as what it is — the return to date.
 */
export function indexGrowth(indexRay: string | null): number | null {
  const ratio = indexRatio(indexRay);
  return ratio === null ? null : ratio - 1;
}

/**
 * Whether the polled half of the row has landed.
 *
 * The binding is event-sourced and the state is polled, so the gap between them
 * is a normal state rather than an error: an asset can be legitimately bound and
 * carry no numbers yet. The fields are written by a single update, so `gross`
 * standing in for all of them is exact rather than a heuristic.
 */
export function isPolled(asset: Pick<YieldAsset, "updatedAt">): boolean {
  return asset.updatedAt !== null;
}
