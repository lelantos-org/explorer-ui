import { useEffect } from "react";
import { type IndexerState, indexerState } from "@/data/indexerState";
import ActivityPanel from "@/features/activity/ActivityPanel";
import AssetsPanel from "@/features/assets/AssetsPanel";
import ChainsPanel from "@/features/chains/ChainsPanel";
import WithdrawalCover from "@/features/cover/WithdrawalCover";
import FilterBar from "@/features/filters/FilterBar";
import { useFilters } from "@/features/filters/useFilters";
import FlowCard from "@/features/flows/FlowCard";
import FlowStats from "@/features/flows/FlowStats";
import KindsCard from "@/features/flows/KindsCard";
import { countScope } from "@/features/flows/meta";
import PoolPanel from "@/features/pool/PoolPanel";
import Hero from "./Hero";
import ReferenceTabs from "./ReferenceTabs";
import { useReferenceTab } from "./referenceTab";
import { useHomeData } from "./useHomeData";
import "./Home.css";

interface Props {
  /** Reports whether the scoped series are arriving, for the header's chip. */
  onIndexerState?: (state: IndexerState) => void;
}

/**
 * The explorer's one page, in reading order: the masthead and filters, the
 * flows, withdrawal cover, then the reference cards behind a tab strip.
 */
export default function Home({ onIndexerState }: Props) {
  const filters = useFilters();
  const { scope, range } = filters;
  const [tab, setTab] = useReferenceTab();
  const data = useHomeData(filters);
  const { flows } = data;

  // The flow pair stands in for the backend as a whole: it is the heaviest
  // query on the page and the one every figure above the fold comes from.
  const indexer = indexerState(flows.query);
  useEffect(() => {
    onIndexerState?.(indexer);
  }, [indexer, onIndexerState]);

  return (
    <section className="home">
      <Hero
        rangeLabel={flows.range.label}
        netFlow={flows.totals?.net ?? null}
        denom={flows.denom}
        loading={flows.query.loading}
        stale={flows.stale}
      />

      <FilterBar
        scope={scope}
        range={range.label}
        hasFilter={filters.hasFilter}
        loading={flows.query.loading}
        updatedAt={flows.query.updatedAt}
        groups={data.scopeGroups}
        onScopeChange={filters.setScope}
        onRangeChange={filters.setRange}
        onClear={filters.clear}
      />

      <FlowStats
        inflow={flows.totals?.inflow ?? null}
        outflow={flows.totals?.outflow ?? null}
        commitments={flows.commitments}
        rangeLabel={flows.range.label}
        denom={flows.denom}
        countScope={countScope(flows.scope)}
        loading={flows.query.loading}
        stale={flows.stale}
      />
      <FlowCard flows={flows} assets={data.assets.data} />
      <KindsCard kinds={data.txKinds} scope={scope} />

      {/* The other finding, not a lookup: a withdrawal's cover is the one
          figure here that is about a user's own position. */}
      <WithdrawalCover
        data={data.anonymity.data}
        assets={data.assets.data}
        loading={data.anonymity.loading}
        error={data.anonymity.error}
      />

      <ReferenceTabs value={tab} onChange={setTab} />

      {tab === "activity" && (
        <ActivityPanel
          recentTx={data.recentTx}
          assets={data.assets.data}
          cohorts={data.anonymity.data}
          kind={filters.txKind}
          onKindChange={filters.setTxKind}
        />
      )}
      {tab === "assets" && (
        <AssetsPanel
          assets={data.assets}
          yields={data.yields}
          groups={data.scopeGroups}
          scope={scope}
          onSelectChain={filters.selectChain}
        />
      )}
      {tab === "chains" && (
        <ChainsPanel
          chainFlows={data.chainFlows}
          selected={scope.chainId}
          onSelectChain={filters.selectChain}
        />
      )}
      {tab === "pool" && (
        <PoolPanel
          locked={data.locked}
          notes={data.poolNotes}
          selected={scope.chainId}
          onSelectChain={filters.selectChain}
        />
      )}
    </section>
  );
}
