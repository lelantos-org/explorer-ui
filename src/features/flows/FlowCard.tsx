import { useMemo } from "react";
import type { AssetOut } from "@/api";
import FlowChart, { FLOW_CHART_HEIGHT } from "@/charts/FlowChart";
import ChartSkeleton from "@/charts/primitives/ChartSkeleton";
import { SERIES_COLOR } from "@/charts/series";
import { assetsInScope } from "@/domain/assets";
import { hasAmounts } from "@/domain/denom";
import Card from "@/ui/Card";
import { LOADING } from "@/ui/cardMeta";
import Empty from "@/ui/Empty";
import Legend, { type LegendItem } from "@/ui/Legend";
import Meta from "@/ui/Meta";
import { flowMeta } from "./meta";
import type { Flows } from "./useFlows";

const LEGEND: LegendItem[] = [
  { label: "inflow", color: SERIES_COLOR.inflow },
  { label: "outflow", color: SERIES_COLOR.outflow },
];

interface Props {
  flows: Flows;
  /** The registry, to name a pinned asset in the caption. */
  assets: AssetOut[] | null;
}

export default function FlowCard({ flows, assets }: Props) {
  // The scope and range the series on screen were fetched for — not the
  // filters, which lead them while a new request is in flight.
  const { scope, range } = flows;
  const { flows: points, denom, query } = flows;
  const scopedAssets = useMemo(() => assetsInScope(assets, scope), [assets, scope]);

  return (
    <Card
      title="Inflow and outflow"
      error={query.error}
      // Dimmed while a new scope or range loads over the old series.
      busy={flows.stale}
      // A caption built from no data would say "no common unit", which is a
      // finding about the assets rather than a request still in flight.
      meta={
        <Meta
          {...(points === null ? LOADING : flowMeta(scope, range, denom, points, scopedAssets))}
        />
      }
      actions={<Legend items={LEGEND} />}
      variant="chart"
    >
      <FlowPlot flows={flows} settled={points !== null && !query.loading} />
    </Card>
  );
}

/**
 * The flow plot, or the reason there isn't one.
 *
 * Two distinct empty states: nothing happened in the range, versus several
 * assets whose amounts share no unit — a curve for the second would be a sum of
 * unlike token amounts, so it says that instead of drawing one.
 */
function FlowPlot({ flows, settled }: { flows: Flows; settled: boolean }) {
  const { flows: points, denom, domain } = flows;
  if (points === null) return <ChartSkeleton height={FLOW_CHART_HEIGHT} />;
  if (settled && points.length === 0) {
    return <Empty>no flow data for this range</Empty>;
  }
  if (points.length > 0 && !hasAmounts(denom)) {
    return (
      <Empty>
        no comparable unit across these assets — pick a single asset above, or wait for price data
      </Empty>
    );
  }
  return <FlowChart data={points} denom={denom} domain={domain} />;
}
