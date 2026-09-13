import { useMemo } from "react";
import {
  useAnonymitySets,
  useAssets,
  useChainFlows24h,
  useLocked,
  usePoolNotes,
  useRecentTx,
  useTxKinds,
  useYield,
} from "@/data/queries";
import { FEED_LIMIT } from "@/features/activity/feed";
import type { Filters } from "@/features/filters/useFilters";
import { useFlows } from "@/features/flows/useFlows";
import { groupAssetsByChain } from "@/lib/scope";

/**
 * Every request the home page makes, in one place.
 *
 * Held at the page rather than inside each card so a hidden reference tab keeps
 * polling: the queries share one 30s interval, so a hidden card costs nothing
 * extra — while fetching per tab would land every switch on a skeleton for data
 * the page already had. It also means the registry and the cohorts, which
 * several cards read, are fetched once rather than once per reader.
 */
export function useHomeData({ scope, range, txKind }: Filters) {
  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const anonymity = useAnonymitySets(scope);
  const flows = useFlows(scope, range);
  const txKinds = useTxKinds(scope.chainId, range);
  const recentTx = useRecentTx(FEED_LIMIT, txKind);
  const locked = useLocked();
  const poolNotes = usePoolNotes(scope.chainId);
  const yields = useYield();

  // Every chain with its assets, as the scope picker lists them and the
  // registry groups them.
  const scopeGroups = useMemo(
    () => groupAssetsByChain(assets.data, chainFlows.data),
    [assets.data, chainFlows.data],
  );

  return {
    assets,
    chainFlows,
    anonymity,
    flows,
    txKinds,
    recentTx,
    locked,
    poolNotes,
    yields,
    scopeGroups,
  };
}
