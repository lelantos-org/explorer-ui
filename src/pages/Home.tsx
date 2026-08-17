import type { AssetOut, FlowPoint } from "../api";
import TxChart from "../components/charts/TxChart";
import TxKindsChart from "../components/charts/TxKindsChart";
import ChainFlowGrid from "../components/home/ChainFlowGrid";
import FilterBar from "../components/home/FilterBar";
import FlowSection from "../components/home/FlowSection";
import Hero from "../components/home/Hero";
import KpiBar from "../components/home/KpiBar";
import LatestTxList from "../components/home/LatestTxList";
import LockedByChain from "../components/home/LockedByChain";
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
import { type Filters, useFilters } from "../hooks/useFilters";
import {
  type ChainsSummary,
  type LockedSummary,
  peakCount,
  sumCounts,
  sumFlows,
  summarizeChains,
  summarizeLocked,
} from "../lib/aggregate";
import { assetLabel, assetsInScope } from "../lib/assets";
import { type Denom, denomLabel, pickDenom, USD_AT_SPOT } from "../lib/denom";
import { fmtBucket, fmtNum, fmtUsd, joinMeta } from "../lib/format";
import { KIND_FILTER_OPTIONS } from "../lib/kinds";
import { groupAssetsByChain } from "../lib/scope";

export default function Home() {
  const filters = useFilters();
  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const locked = useLocked();
  const recentTx = useRecentTx(20, filters.txKind);
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

  // `/v1/tx-counts` and `/v1/tx-kinds` take a chain and no asset, so pinning one
  // narrows the flows and leaves every count chain-wide. Say it on the tiles and
  // cards that keep the wider scope rather than letting the row read as one
  // asset's transactions.
  const countScope = filters.assetIdU64 ? "all assets" : undefined;
  const countMeta = joinMeta([`bucket ${bucket}`, countScope]);

  const scopedAssets = assetsInScope(assets.data, filters);

  return (
    <section className="home">
      <Hero
        rangeLabel={filters.range.label}
        assetCount={scopedAssets?.length ?? null}
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

      <Card title="escrowed by chain" meta={lockedMeta(summarizeLocked(locked.data))}>
        <LockedByChain
          data={locked.data}
          loading={locked.loading}
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
        countScope={countScope}
      />

      <Card
        title="inflow / outflow"
        meta={flowMeta(filters, denom, flows, scopedAssets)}
        variant="chart"
      >
        <FlowSection flows={flows} denom={denom} domain={domain} loading={flowAndTx.loading} />
      </Card>

      <Card title="transactions over time" meta={countMeta} variant="chart">
        <TxChart data={counts ?? []} domain={domain} />
      </Card>

      <Card
        title="transactions by kind"
        meta={
          // Grouped, not stacked: bars are compared against each other, so the
          // axis is per-kind and not a bucket total. `pending` is named as
          // excluded rather than silently dropped — the plot is not every
          // transaction, and a reader totalling the bars should know that.
          txKinds.data ? `grouped by kind · pending excluded · ${countMeta}` : "loading…"
        }
        variant="chart"
      >
        <TxKindsChart data={txKinds.data ?? []} bucketSec={filters.range.bucket} domain={domain} />
      </Card>

      <Card
        title="latest transactions"
        // The kind sits on the card, not in the filter bar: this feed is
        // global — the bar's chain and range do not reach it — so a control up
        // there would read as narrowing a page it does not narrow.
        actions={
          <Segmented
            options={KIND_FILTER_OPTIONS}
            value={filters.txKind}
            disabled={recentTx.loading}
            onChange={filters.setTxKind}
          />
        }
        meta={recentTx.data ? `${recentTx.data.length} most recent` : "loading…"}
      >
        <LatestTxList
          data={recentTx.data}
          assets={assets.data}
          loading={recentTx.loading}
          kind={filters.txKind}
        />
      </Card>
    </section>
  );
}

function chainsMeta(s: ChainsSummary | null): string {
  if (!s) return "loading…";
  // inflow/outflow are reserved backend fields, still zero today — omit them
  // rather than render 0 as a measurement.
  return joinMeta([
    `${s.chains} chains`,
    s.hasValues && `in ${fmtNum(s.inflow)}`,
    s.hasValues && `out ${fmtNum(s.outflow)}`,
    `${fmtNum(s.tx)} tx`,
  ]);
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
  scopedAssets: AssetOut[] | null,
): string {
  // A pinned asset is the only member of the scope. It is named by symbol or
  // address; "unknown token" covers the registry not being loaded yet, which the
  // registry id would only paper over.
  const scoped = filters.assetIdU64 ? scopedAssets?.[0] : undefined;
  return joinMeta([
    filters.assetIdU64 ? `asset ${scoped ? assetLabel(scoped) : "unknown token"}` : "all assets",
    denomLabel(denom, flows),
    filters.chainId && `chain ${filters.chainId}`,
    `bucket ${fmtBucket(filters.range.bucket)}`,
  ]);
}

/**
 * The card's own caveat line: what the network holds, and what that figure is
 * leaving out. A chain whose assets are all unpriced contributes nothing to the
 * total, so the count of excluded assets travels with it.
 */
function lockedMeta(summary: LockedSummary | null): string {
  if (!summary) return "loading…";
  if (summary.chains === 0) return "nothing escrowed";
  const { chains, totalUsd, unpricedAssets } = summary;
  return joinMeta([
    totalUsd === null
      ? `${chains} chains · no usable prices`
      : `${fmtUsd(totalUsd)} across ${chains} chains`,
    `deposits − withdrawals · ${USD_AT_SPOT}`,
    unpricedAssets > 0 &&
      `${unpricedAssets} unpriced asset${unpricedAssets === 1 ? "" : "s"} excluded`,
  ]);
}
