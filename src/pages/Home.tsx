import { useMemo } from "react";
import Card from "../components/Card";
import ChainFlowGrid from "../components/ChainFlowGrid";
import FlowChart from "../components/charts/FlowChart";
import TxChart from "../components/charts/TxChart";
import FilterBar from "../components/home/FilterBar";
import Hero from "../components/home/Hero";
import KpiBar from "../components/home/KpiBar";
import { useAssets } from "../hooks/useAssets";
import { useChainFlows24h } from "../hooks/useChainFlows";
import { useFilters } from "../hooks/useFilters";
import { useFlowAndTx } from "../hooks/useFlowAndTx";
import { fmtBucket, fmtNum } from "../lib/format";

export default function Home() {
  const filters = useFilters();
  const assets = useAssets();
  const chainFlows = useChainFlows24h();
  const { flows, counts, domain, loading, error } = useFlowAndTx({
    chainId: filters.chainId,
    assetIdU64: filters.assetIdU64,
    range: filters.range,
  });

  const chains = useMemo(
    () => (assets ? [...new Set(assets.map((a) => a.chain_id))].sort((a, b) => a - b) : []),
    [assets],
  );

  const assetOptions = useMemo(() => {
    if (!assets) return [];
    return filters.chainId
      ? assets.filter((a) => a.chain_id === Number(filters.chainId))
      : assets;
  }, [assets, filters.chainId]);

  const totals = useMemo(() => {
    if (!flows) return null;
    const inflow = flows.reduce((s, p) => s + p.in, 0);
    const outflow = flows.reduce((s, p) => s + p.out, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [flows]);

  const txTotal = useMemo(
    () => (counts ? counts.reduce((s, p) => s + p.count, 0) : null),
    [counts],
  );

  const peakBucket = useMemo(() => {
    if (!counts || counts.length === 0) return null;
    return counts.reduce((m, p) => (p.count > m ? p.count : m), 0);
  }, [counts]);

  const chains24hSummary = useMemo(() => {
    if (!chainFlows) return null;
    return chainFlows.reduce(
      (acc, c) => ({
        in: acc.in + c.inflow,
        out: acc.out + c.outflow,
        tx: acc.tx + c.txCount,
        chains: acc.chains + 1,
      }),
      { in: 0, out: 0, tx: 0, chains: 0 },
    );
  }, [chainFlows]);

  const flowMeta = `${filters.assetIdU64 ? `asset #${filters.assetIdU64}` : "all assets"}${
    filters.chainId ? ` · chain ${filters.chainId}` : ""
  } · bucket ${fmtBucket(filters.range.bucket)}`;

  return (
    <section className="home">
      <Hero
        rangeLabel={filters.range.label}
        assetCount={assets?.length ?? null}
        chainId={filters.chainId}
        netFlow={totals?.net ?? null}
      />

      <FilterBar
        chainId={filters.chainId}
        assetIdU64={filters.assetIdU64}
        rangeIdx={filters.rangeIdx}
        hasFilter={filters.hasFilter}
        loading={loading}
        chains={chains}
        assetOptions={assetOptions}
        onChainChange={(v) => {
          filters.setChainId(v);
          filters.setAssetIdU64("");
        }}
        onAssetChange={filters.setAssetIdU64}
        onRangeChange={filters.setRangeIdx}
        onClear={filters.clear}
      />

      {error && <div className="err">! {error}</div>}

      <Card
        title="chain flows · last 24h"
        meta={
          chains24hSummary
            ? `${chains24hSummary.chains} chains · in ${fmtNum(chains24hSummary.in)} · out ${fmtNum(chains24hSummary.out)} · ${fmtNum(chains24hSummary.tx)} tx`
            : "loading…"
        }
      >
        <ChainFlowGrid
          data={chainFlows}
          selected={filters.chainId ? Number(filters.chainId) : null}
          onSelect={filters.selectChain}
        />
      </Card>

      <KpiBar
        inflow={totals?.inflow ?? null}
        outflow={totals?.outflow ?? null}
        txTotal={txTotal}
        peakBucket={peakBucket}
      />

      <Card title="inflow / outflow" meta={flowMeta} variant="chart">
        {flows && flows.length === 0 && !loading ? (
          <div className="empty">
            no flow data
            {!filters.assetIdU64 && " · backend lacks per-asset flow endpoint — set VITE_USE_MOCK=1 to preview"}
          </div>
        ) : (
          <FlowChart data={flows ?? []} domain={domain} />
        )}
      </Card>

      <Card title="transactions over time" meta={`bucket ${fmtBucket(filters.range.bucket)}`} variant="chart">
        <TxChart data={counts ?? []} domain={domain} />
      </Card>
    </section>
  );
}
