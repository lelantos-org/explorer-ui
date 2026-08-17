import type { AssetOut, FlowPoint } from "../api";
import TxChart from "../components/charts/TxChart";
import TxKindsChart from "../components/charts/TxKindsChart";
import ChainFlowGrid from "../components/home/ChainFlowGrid";
import FilterBar from "../components/home/FilterBar";
import FlowSection from "../components/home/FlowSection";
import Hero from "../components/home/Hero";
import KpiBar from "../components/home/KpiBar";
import LatestTxList from "../components/home/LatestTxList";
import Card from "../components/ui/Card";
import {
  useAssets,
  useChainFlows24h,
  useFlowAndTx,
  useRecentTx,
  useTxKinds,
} from "../hooks/queries";
import { type Filters, useFilters } from "../hooks/useFilters";
import {
  type ChainsSummary,
  peakCount,
  sumCounts,
  sumFlows,
  summarizeChains,
} from "../lib/aggregate";
import { assetKey, assetLabel, indexAssets } from "../lib/assets";
import { type Denom, denomLabel, pickDenom } from "../lib/denom";
import { fmtBucket, fmtNum } from "../lib/format";
import { groupAssetsByChain } from "../lib/scope";

export default function Home() {
  const filters = useFilters();
  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const recentTx = useRecentTx(20);
  const txKinds = useTxKinds(filters.chainId, filters.range);
  const flowAndTx = useFlowAndTx({
    chainId: filters.chainId,
    assetIdU64: filters.assetIdU64,
    range: filters.range,
  });

  const flows = flowAndTx.data?.flows ?? null;
  const counts = flowAndTx.data?.counts ?? null;
  const domain = flowAndTx.data?.domain ?? null;

  // One denomination for the whole range, so the chart, the KPI tiles and the
  // hero can never disagree about what their numbers mean.
  const denom = pickDenom(flows);
  const totals = sumFlows(flows, denom);
  const bucket = fmtBucket(filters.range.bucket);

  return (
    <section className="home">
      <Hero
        rangeLabel={filters.range.label}
        assetCount={assets.data?.length ?? null}
        chainId={filters.chainId}
        netFlow={totals?.net ?? null}
        denom={denom}
      />

      <FilterBar
        scope={filters.scope}
        rangeIdx={filters.rangeIdx}
        hasFilter={filters.hasFilter}
        loading={flowAndTx.loading}
        groups={groupAssetsByChain(assets.data, chainFlows.data)}
        onScopeChange={filters.setScope}
        onRangeChange={filters.setRangeIdx}
        onClear={filters.clear}
      />

      {flowAndTx.error && <div className="err">! {flowAndTx.error}</div>}

      <Card title="chain flows · last 24h" meta={chainsMeta(summarizeChains(chainFlows.data))}>
        <ChainFlowGrid
          data={chainFlows.data}
          selected={filters.chainId ? Number(filters.chainId) : null}
          onSelect={filters.selectChain}
        />
      </Card>

      <KpiBar
        inflow={totals?.inflow ?? null}
        outflow={totals?.outflow ?? null}
        txTotal={sumCounts(counts)}
        peak={peakCount(counts)}
        bucketSec={filters.range.bucket}
        denom={denom}
      />

      <Card
        title="inflow / outflow"
        meta={flowMeta(filters, denom, flows, assets.data)}
        variant="chart"
      >
        <FlowSection flows={flows} denom={denom} domain={domain} loading={flowAndTx.loading} />
      </Card>

      <Card title="transactions over time" meta={`bucket ${bucket}`} variant="chart">
        <TxChart data={counts ?? []} domain={domain} />
      </Card>

      <Card
        title="transactions by kind"
        meta={
          // Grouped, not stacked: bars are compared against each other, so the
          // axis is per-kind and not a bucket total. `pending` is named as
          // excluded rather than silently dropped — the plot is not every
          // transaction, and a reader totalling the bars should know that.
          txKinds.data ? `grouped by kind · pending excluded · bucket ${bucket}` : "loading…"
        }
        variant="chart"
      >
        <TxKindsChart data={txKinds.data ?? []} bucketSec={filters.range.bucket} domain={domain} />
      </Card>

      <Card
        title="latest transactions"
        meta={recentTx.data ? `${recentTx.data.length} most recent` : "loading…"}
      >
        <LatestTxList data={recentTx.data} assets={assets.data} loading={recentTx.loading} />
      </Card>
    </section>
  );
}

function chainsMeta(s: ChainsSummary | null): string {
  if (!s) return "loading…";
  // inflow/outflow are reserved backend fields, still zero today — omit them
  // rather than render 0 as a measurement.
  const value = s.hasValues ? ` · in ${fmtNum(s.inflow)} · out ${fmtNum(s.outflow)}` : "";
  return `${s.chains} chains${value} · ${fmtNum(s.tx)} tx`;
}

/**
 * Name the unit rather than leaving the reader to guess. Token amounts are
 * per-asset, dollars are the only cross-asset value, and a partial dollar total
 * says how much it is leaving out.
 */
function flowMeta(
  filters: Filters,
  denom: Denom,
  flows: FlowPoint[] | null,
  assets: AssetOut[] | null,
): string {
  // The scoped asset is named by symbol or address; "unknown token" covers the
  // registry not being loaded yet, which the id would only paper over.
  const scoped = indexAssets(assets).get(
    assetKey(Number(filters.chainId), Number(filters.assetIdU64)),
  );
  return [
    filters.assetIdU64 ? `asset ${scoped ? assetLabel(scoped) : "unknown token"}` : "all assets",
    denomLabel(denom, flows),
    filters.chainId ? `chain ${filters.chainId}` : null,
    `bucket ${fmtBucket(filters.range.bucket)}`,
  ]
    .filter((part) => part !== null)
    .join(" · ");
}
