/**
 * The caption under each card's title.
 *
 * They live together because they answer one question in several places: what
 * the figures above them actually cover. Each is a pure function of
 * already-loaded data, so what a card claims can be tested without rendering it.
 *
 * A caption carries three different kinds of fact, and they are returned apart
 * rather than joined into one line. Flattened into a single `·` chain they read
 * at identical weight, so "what this measures" is indistinguishable from "what
 * is missing from it" — and the second is the part a reader has to act on.
 */
import type { AnonymitySet, AssetOut, FlowPoint, PoolNotes, YieldAsset } from "../../api";
import type { ChainsSummary, LockedSummary } from "../../lib/aggregate";
import { coverTone, isDormant, RECENT_WINDOW_SEC, THIN_SET } from "../../lib/anonymity";
import { assetIdTag, assetLabel } from "../../lib/assets";
import { type Denom, denomLabel, USD_AT_SPOT } from "../../lib/denom";
import { hasUnknownFee } from "../../lib/fees";
import { fmtBucket, fmtNum, fmtUsd, joinMeta, plural } from "../../lib/format";
import type { Range } from "../../lib/ranges";
import type { Scope, ScopeGroup } from "../../lib/scope";
import { isPolled } from "../../lib/yield";

/**
 * One card's caption, in three tiers.
 *
 * The split is by what a reader does with each part, not by length:
 *
 * - `lead` — the figure. What the card counts, and how much of it there is.
 * - `basis` — the definition. What that figure means, and the caveats that
 *   change how it should be read. Present only where the number is open to
 *   being misread; most cards need none.
 * - `gaps` — what the figure leaves out or flags. The actionable part: assets
 *   missing from a total, cohorts below a safe size, fields the indexer has not
 *   resolved. Rendered in the warn tone so it can be scanned without reading.
 */
export interface CardMeta {
  lead: string;
  basis?: string;
  gaps?: string[];
}

export const LOADING: CardMeta = { lead: "loading…" };

/** Drop the empties, for a gap list that is mostly conditional. */
const gapList = (...values: (string | false | undefined)[]): string[] =>
  values.filter((v): v is string => Boolean(v));

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
export function registryMeta(groups: ScopeGroup[], yields: YieldAsset[] | null): CardMeta {
  const assets = groups.flatMap((g) => g.assets);
  // `hasUnknownFee` rather than a null check spelled out again here: what
  // counts as an unindexed rate is decided once, in `lib/fees`.
  const unindexed = assets.filter(hasUnknownFee).length;
  // Scoped to the chains on show, so the caption counts the same rows the table
  // does rather than every yield asset the backend knows about.
  const shown = new Set(groups.map((g) => g.chainId));
  const earning = (yields ?? []).filter((y) => shown.has(y.chainId));
  const unpolled = earning.filter((y) => !isPolled(y)).length;
  return {
    lead: joinMeta([
      plural(assets.length, "asset"),
      plural(groups.length, "chain"),
      earning.length > 0 && `${earning.length} earning`,
    ]),
    // Load-bearing: the return column looks like a yield, and a reader takes a
    // yield for an annual rate unless told otherwise. Nothing here can
    // annualise — one current index per asset, no history to fit a period to.
    basis: earning.length > 0 ? "return to date, not annualised" : undefined,
    gaps: gapList(
      unpolled > 0 && `${unpolled} awaiting a first poll`,
      unindexed > 0 && `${unindexed} with unindexed fees`,
    ),
  };
}

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

export function chainsMeta(summary: ChainsSummary | null): CardMeta {
  if (!summary) return LOADING;
  // inflow/outflow are reserved backend fields, still zero today — omit them
  // rather than render 0 as a measurement.
  const { chains, hasValues, inflow, outflow, tx } = summary;
  return {
    lead: joinMeta([
      `${chains} chains`,
      hasValues && `in ${fmtNum(inflow)}`,
      hasValues && `out ${fmtNum(outflow)}`,
      `${fmtNum(tx)} tx`,
    ]),
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
export function anonymityMeta(sets: AnonymitySet[] | null): CardMeta {
  if (!sets) return LOADING;
  if (sets.length === 0) return { lead: "no denominations recorded" };
  // `coverTone` owns what "thin" means; THIN_SET is only the number to print.
  const thin = sets.filter((s) => coverTone(s.count) !== "counted").length;
  const dormant = sets.filter(isDormant).length;
  return {
    lead: plural(sets.length, "denomination"),
    basis: "all history · at most, not exactly",
    gaps: gapList(
      thin > 0 && `${thin} below k=${THIN_SET}`,
      // Only counted over cohorts that actually reported a window; a backend
      // that sent none contributes no dormancy claim rather than "all dormant".
      dormant > 0 && `${dormant} dormant in ${fmtBucket(RECENT_WINDOW_SEC)}`,
    ),
  };
}

/**
 * What the note counts are, and what they are not.
 *
 * Named "per chain" rather than totalled: the trees are separate, so the counts
 * do not add. The caption says so because the card's shape — a list of numbers —
 * otherwise invites summing them.
 */
export function poolNotesMeta(notes: PoolNotes[] | null): CardMeta {
  if (!notes) return LOADING;
  if (notes.length === 0) return { lead: "no notes committed" };
  const feeNotes = notes.reduce((sum, n) => sum + n.feeNotes, 0);
  return {
    lead: `${notes.length} chains`,
    basis: "not summable · user notes",
    gaps: gapList(feeNotes > 0 && `${feeNotes.toLocaleString()} relayer notes excluded`),
  };
}

/**
 * The escrow card's own caveat line: what the network holds, and what that
 * figure is leaving out. A chain whose assets are all unpriced contributes
 * nothing to the total, so the count of excluded assets travels with it.
 */
export function lockedMeta(summary: LockedSummary | null): CardMeta {
  if (!summary) return LOADING;
  if (summary.chains === 0) return { lead: "nothing escrowed" };
  const { chains, totalUsd, unpricedAssets, venueHeldAssets } = summary;
  return {
    lead:
      totalUsd === null
        ? `${chains} chains · no usable prices`
        : `${fmtUsd(totalUsd)} across ${chains} chains`,
    // The definition is conditional because it is not one definition. A yield
    // asset's balance is read from its venue, and claiming the whole card is
    // "deposits − withdrawals" while any such asset is in it is simply wrong —
    // that difference misses everything those assets have earned.
    basis: joinMeta([
      venueHeldAssets > 0
        ? `deposits − withdrawals, except ${plural(venueHeldAssets, "venue-held asset")}`
        : "deposits − withdrawals",
      USD_AT_SPOT,
    ]),
    gaps: gapList(unpricedAssets > 0 && `${plural(unpricedAssets, "unpriced asset")} excluded`),
  };
}
