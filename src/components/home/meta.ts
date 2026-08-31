/**
 * The caption line under each card's title.
 *
 * They live together because they answer one question in four places: what the
 * figures above them actually cover. Each is a pure function of already-loaded
 * data, so what a card claims can be tested without rendering it.
 */
import type { AnonymitySet, AssetOut, FlowPoint, PoolNotes } from "../../api";
import type { ChainsSummary, LockedSummary } from "../../lib/aggregate";
import { coverTone, isDormant, RECENT_WINDOW_SEC, THIN_SET } from "../../lib/anonymity";
import { assetLabel } from "../../lib/assets";
import { type Denom, denomLabel, USD_AT_SPOT } from "../../lib/denom";
import { hasUnknownFee } from "../../lib/fees";
import { fmtBucket, fmtNum, fmtUsd, joinMeta, plural } from "../../lib/format";
import type { Range } from "../../lib/ranges";
import type { Scope, ScopeGroup } from "../../lib/scope";

export const LOADING = "loading…";

/** "1 unpriced asset" / "3 unpriced assets", or nothing when none are. */
const unpricedNote = (count: number): string | false =>
  count > 0 && `${plural(count, "unpriced asset")} excluded`;

/**
 * What the count-based cards cover, which is wider than the flow cards whenever
 * an asset is pinned: `/v1/tx-counts` and `/v1/tx-kinds` take a chain and no
 * asset. Unsaid, those cards read as one asset's transactions.
 */
export function countScope(scope: Scope): string | undefined {
  return scope.assetIdU64 !== null ? "all assets" : undefined;
}

/**
 * What the registry covers, and how much of it the indexer has not resolved.
 *
 * The unpriced note stays out of this one: the registry's own gaps are the
 * unknown fee legs, which are what stops a wallet quoting a shield. A price is
 * decoration by comparison.
 */
export function registryMeta(groups: ScopeGroup[]): string {
  const assets = groups.flatMap((g) => g.assets);
  // `hasUnknownFee` rather than a null check spelled out again here: what
  // counts as an unindexed rate is decided once, in `lib/fees`.
  const unindexed = assets.filter(hasUnknownFee).length;
  return joinMeta([
    plural(assets.length, "asset"),
    plural(groups.length, "chain"),
    unindexed > 0 && `${unindexed} with unindexed fees`,
  ]);
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
 * What the cohort figures cover, and the two ways they overstate cover.
 *
 * Both caveats are load-bearing and neither is visible from the numbers:
 *
 * - **all history** — an anonymity set is every withdrawal of that denomination
 *   the pool has ever seen, so this card ignores the range the rest of the page
 *   is filtered to. Unsaid, a reader takes these counts for the selected window
 *   and reads every k as far smaller than it is.
 * - **at most, not exactly** — k counts withdrawals, and one person exiting
 *   repeatedly at one denomination is indistinguishable here from that many
 *   separate users. k bounds cover from above; it is not a headcount.
 *
 * `meta.test.ts` asserts both phrases survive. They are the only place either is
 * stated at card level, and prose with no test rots silently.
 */
export function anonymityMeta(sets: AnonymitySet[] | null): string {
  if (!sets) return LOADING;
  if (sets.length === 0) return "no denominations recorded";
  // `coverTone` owns what "thin" means; THIN_SET is only the number to print.
  const thin = sets.filter((s) => coverTone(s.count) !== "counted").length;
  const dormant = sets.filter(isDormant).length;
  return joinMeta([
    plural(sets.length, "denomination"),
    "all history · at most, not exactly",
    thin > 0 && `${thin} below k=${THIN_SET}`,
    // Only counted over cohorts that actually reported a window; a backend
    // that sent none contributes no dormancy claim rather than "all dormant".
    dormant > 0 && `${dormant} dormant in ${fmtBucket(RECENT_WINDOW_SEC)}`,
  ]);
}

/**
 * What the note counts are, and what they are not.
 *
 * Named "per chain" rather than totalled: the trees are separate, so the counts
 * do not add. The caption says so because the card's shape — a list of numbers —
 * otherwise invites summing them.
 */
export function poolNotesMeta(notes: PoolNotes[] | null): string {
  if (!notes) return LOADING;
  if (notes.length === 0) return "no notes committed";
  const feeNotes = notes.reduce((sum, n) => sum + n.feeNotes, 0);
  return joinMeta([
    `${notes.length} chains · not summable`,
    "user notes · relayer notes excluded",
    feeNotes > 0 && `${feeNotes.toLocaleString()} relayer notes`,
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
