import { useMemo } from "react";
import TxKindsChart from "../components/charts/TxKindsChart";
import AnonymitySets from "../components/home/AnonymitySets";
import AssetRegistry from "../components/home/AssetRegistry";
import ChainFlowGrid from "../components/home/ChainFlowGrid";
import FilterBar from "../components/home/FilterBar";
import FlowSection from "../components/home/FlowSection";
import Hero from "../components/home/Hero";
import KpiBar from "../components/home/KpiBar";
import LatestTxList from "../components/home/LatestTxList";
import LockedByChain from "../components/home/LockedByChain";
import {
  anonymityMeta,
  chainsMeta,
  countScope,
  flowMeta,
  kindsMeta,
  LOADING,
  lockedMeta,
  poolNotesMeta,
  registryMeta,
} from "../components/home/meta";
import PoolNotes from "../components/home/PoolNotes";
import Card from "../components/ui/Card";
import Meta from "../components/ui/Meta";
import Segmented from "../components/ui/Segmented";
import {
  useAnonymitySets,
  useAssets,
  useChainFlows24h,
  useFlowAndTx,
  useLocked,
  usePoolNotes,
  useRecentTx,
  useTxKinds,
  useYield,
} from "../hooks/queries";
import { useFilters } from "../hooks/useFilters";
import { sumCounts, sumFlows, summarizeChains, summarizeLocked } from "../lib/aggregate";
import { assetsInScope, indexAssets } from "../lib/assets";
import { pickDenom } from "../lib/denom";
import { KIND_FILTER_OPTIONS } from "../lib/kinds";
import { groupAssetsByChain, groupsInScope } from "../lib/scope";

const RECENT_TX_LIMIT = 20;

export default function Home() {
  const { scope, range, txKind, hasFilter, setScope, setRange, setTxKind, selectChain, clear } =
    useFilters();

  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const locked = useLocked();
  const recentTx = useRecentTx(RECENT_TX_LIMIT, txKind);
  const txKinds = useTxKinds(scope.chainId, range);
  const anonymity = useAnonymitySets(scope);
  const poolNotes = usePoolNotes(scope.chainId);
  const yields = useYield();
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
  // The picker offers every chain; the registry shows the selected one. Chain
  // only: a pinned asset narrows the rest of the page but not this card, which
  // is the list that asset was chosen from.
  const registryGroups = useMemo(() => groupsInScope(scopeGroups, scope), [scopeGroups, scope]);
  // Keyed once per fetch rather than per row: the registry renders every asset
  // on every chain, and a linear scan per row would be quadratic in the
  // registry's size for a lookup that never changes between rows. `null`
  // survives the memo — the registry has to tell "not loaded yet" from "this
  // asset does not earn".
  const yieldIndex = useMemo(
    () => (yields.data === null ? null : indexAssets(yields.data)),
    [yields.data],
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

      <Card
        title="supported assets"
        error={assets.error}
        // Directly under the filter bar and narrowed by it: this is what the
        // scope above is selecting from, so it reads as the filter's subject
        // rather than as another metric further down the page.
        meta={<Meta {...(assets.data ? registryMeta(registryGroups, yields.data) : LOADING)} />}
      >
        <AssetRegistry
          groups={registryGroups}
          loading={assets.loading}
          yields={yieldIndex}
          selected={scope.chainId}
          onSelect={selectChain}
        />
      </Card>

      <Card
        title="chain flows · last 24h"
        error={chainFlows.error}
        meta={<Meta {...chainsMeta(summarizeChains(chainFlows.data))} />}
      >
        <ChainFlowGrid data={chainFlows.data} selected={scope.chainId} onSelect={selectChain} />
      </Card>

      <Card
        title="escrowed by chain"
        error={locked.error}
        meta={<Meta {...lockedMeta(summarizeLocked(locked.data))} />}
      >
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
        denom={denom}
        countScope={countScope(scope)}
      />

      <Card
        title="inflow / outflow"
        error={flowAndTx.error}
        meta={<Meta {...flowMeta(scope, range, denom, flows, scopedAssets)} />}
        variant="chart"
      >
        <FlowSection flows={flows} denom={denom} domain={domain} loading={flowAndTx.loading} />
      </Card>

      <Card
        title="transactions by kind"
        error={txKinds.error}
        meta={<Meta {...(txKinds.data ? kindsMeta(range, scope) : LOADING)} />}
        variant="chart"
      >
        <TxKindsChart data={txKinds.data ?? []} bucketSec={range.bucket} domain={domain} />
      </Card>

      <Card
        title="withdrawal anonymity"
        error={anonymity.error}
        meta={<Meta {...anonymityMeta(anonymity.data)} />}
      >
        <AnonymitySets data={anonymity.data} assets={assets.data} loading={anonymity.loading} />
      </Card>

      <Card
        title="latest transactions"
        error={recentTx.error}
        // The kind sits on the card, not in the filter bar: this feed is
        // global — the bar's chain and range do not reach it — so a control up
        // there would read as narrowing a page it does not narrow.
        actions={
          <Segmented
            label="transaction kind"
            options={KIND_FILTER_OPTIONS}
            value={txKind}
            disabled={recentTx.loading}
            onChange={setTxKind}
          />
        }
        meta={
          <Meta {...(recentTx.data ? { lead: `${recentTx.data.length} most recent` } : LOADING)} />
        }
      >
        <LatestTxList
          data={recentTx.data}
          assets={assets.data}
          cohorts={anonymity.data}
          loading={recentTx.loading}
          kind={txKind}
        />
      </Card>

      <Card
        title="pool notes"
        error={poolNotes.error}
        meta={<Meta {...poolNotesMeta(poolNotes.data)} />}
      >
        <PoolNotes
          data={poolNotes.data}
          loading={poolNotes.loading}
          selected={scope.chainId}
          onSelect={selectChain}
        />
      </Card>
    </section>
  );
}
