import { useMemo } from "react";
import TxChart from "../components/charts/TxChart";
import TxKindsChart from "../components/charts/TxKindsChart";
import ChainFlowGrid from "../components/home/ChainFlowGrid";
import FilterBar from "../components/home/FilterBar";
import FlowSection from "../components/home/FlowSection";
import Hero from "../components/home/Hero";
import KpiBar from "../components/home/KpiBar";
import LatestTxList from "../components/home/LatestTxList";
import LockedByChain from "../components/home/LockedByChain";
import {
  chainsMeta,
  countScope,
  countsMeta,
  flowMeta,
  kindsMeta,
  LOADING,
  lockedMeta,
} from "../components/home/meta";
import Card from "../components/ui/Card";
import Segmented from "../components/ui/Segmented";
import {
  useAssets,
  useChainFlows24h,
  useFlowAndTx,
  useLocked,
  useRecentTx,
  useTxKinds,
} from "../hooks/queries";
import { useFilters } from "../hooks/useFilters";
import { peakCount, sumCounts, sumFlows, summarizeChains, summarizeLocked } from "../lib/aggregate";
import { assetsInScope } from "../lib/assets";
import { pickDenom } from "../lib/denom";
import { KIND_FILTER_OPTIONS } from "../lib/kinds";
import { groupAssetsByChain } from "../lib/scope";

const RECENT_TX_LIMIT = 20;

export default function Home() {
  const { scope, range, txKind, hasFilter, setScope, setRange, setTxKind, selectChain, clear } =
    useFilters();

  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const locked = useLocked();
  const recentTx = useRecentTx(RECENT_TX_LIMIT, txKind);
  const txKinds = useTxKinds(scope.chainId, range);
  const flowAndTx = useFlowAndTx(scope, range);

  const { flows = null, counts = null, domain = null } = flowAndTx.data ?? {};

  // One denomination for the whole range, so the chart, the KPI tiles and the
  // hero can never disagree about what their numbers mean.
  const denom = pickDenom(flows);
  const totals = sumFlows(flows, denom);

  const scopedAssets = useMemo(() => assetsInScope(assets.data, scope), [assets.data, scope]);
  const scopeGroups = useMemo(
    () => groupAssetsByChain(assets.data, chainFlows.data),
    [assets.data, chainFlows.data],
  );

  return (
    <section className="home">
      <Hero
        rangeLabel={range.label}
        assetCount={scopedAssets?.length ?? null}
        chainId={scope.chainId}
        netFlow={totals?.net ?? null}
        denom={denom}
      />

      <FilterBar
        scope={scope}
        range={range.label}
        hasFilter={hasFilter}
        loading={flowAndTx.loading}
        groups={scopeGroups}
        onScopeChange={setScope}
        onRangeChange={setRange}
        onClear={clear}
      />

      {flowAndTx.error && <div className="err">! {flowAndTx.error}</div>}

      <Card title="chain flows · last 24h" meta={chainsMeta(summarizeChains(chainFlows.data))}>
        <ChainFlowGrid data={chainFlows.data} selected={scope.chainId} onSelect={selectChain} />
      </Card>

      <Card title="escrowed by chain" meta={lockedMeta(summarizeLocked(locked.data))}>
        <LockedByChain
          data={locked.data}
          loading={locked.loading}
          selected={scope.chainId}
          onSelect={selectChain}
        />
      </Card>

      <KpiBar
        inflow={totals?.inflow ?? null}
        outflow={totals?.outflow ?? null}
        txTotal={sumCounts(counts)}
        peak={peakCount(counts)}
        bucketSec={range.bucket}
        denom={denom}
        countScope={countScope(scope)}
      />

      <Card
        title="inflow / outflow"
        meta={flowMeta(scope, range, denom, flows, scopedAssets)}
        variant="chart"
      >
        <FlowSection flows={flows} denom={denom} domain={domain} loading={flowAndTx.loading} />
      </Card>

      <Card title="transactions over time" meta={countsMeta(range, scope)} variant="chart">
        <TxChart data={counts ?? []} domain={domain} />
      </Card>

      <Card
        title="transactions by kind"
        meta={txKinds.data ? kindsMeta(range, scope) : LOADING}
        variant="chart"
      >
        <TxKindsChart data={txKinds.data ?? []} bucketSec={range.bucket} domain={domain} />
      </Card>

      <Card
        title="latest transactions"
        // The kind sits on the card, not in the filter bar: this feed is
        // global — the bar's chain and range do not reach it — so a control up
        // there would read as narrowing a page it does not narrow.
        actions={
          <Segmented
            options={KIND_FILTER_OPTIONS}
            value={txKind}
            disabled={recentTx.loading}
            onChange={setTxKind}
          />
        }
        meta={recentTx.data ? `${recentTx.data.length} most recent` : LOADING}
      >
        <LatestTxList
          data={recentTx.data}
          assets={assets.data}
          loading={recentTx.loading}
          kind={txKind}
        />
      </Card>
    </section>
  );
}
