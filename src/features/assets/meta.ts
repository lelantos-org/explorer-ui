import type { YieldAsset } from "@/api";
import { hasUnknownFee } from "@/lib/fees";
import { joinMeta, plural } from "@/lib/format";
import type { ScopeGroup } from "@/lib/scope";
import { isPolled } from "@/lib/yield";
import { type CardMeta, gapList } from "@/ui/cardMeta";

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
    // Worded to match the column header, so the caption and the figures under
    // it name the same period rather than two that have to be reconciled.
    basis: earning.length > 0 ? "return since bound · not annualised" : undefined,
    gaps: gapList(
      unpolled > 0 && `${unpolled} awaiting a first poll`,
      unindexed > 0 && `${unindexed} with unindexed fees`,
    ),
  };
}
