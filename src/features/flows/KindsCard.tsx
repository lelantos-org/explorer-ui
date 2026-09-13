import ChartSkeleton from "@/charts/ChartSkeleton";
import TxKindsChart, { KINDS_CHART_HEIGHT } from "@/charts/TxKindsChart";
import type { TxKinds } from "@/data/queries";
import type { Async } from "@/data/useAsync";
import { PLOTTED_KINDS } from "@/lib/kinds";
import type { Scope } from "@/lib/scope";
import Card from "@/ui/Card";
import { LOADING } from "@/ui/cardMeta";
import Legend, { type LegendItem } from "@/ui/Legend";
import Meta from "@/ui/Meta";
import { kindColor } from "@/ui/series";
import { kindsMeta } from "./meta";

/** Derived from what the chart plots, so a kind it drops leaves the key too. */
const LEGEND: LegendItem[] = PLOTTED_KINDS.map((kind) => ({
  label: kind,
  color: kindColor(kind),
}));

interface Props {
  kinds: Async<TxKinds>;
  /** Only for the caption's note that counts ignore a pinned asset. */
  scope: Scope;
}

/**
 * Transactions per kind over the range. Beside the flows rather than behind a
 * tab: it follows the same scope and range, so it answers the same question the
 * plot above it does — what happened here, in this window — split by kind.
 */
export default function KindsCard({ kinds, scope }: Props) {
  const { data } = kinds;
  return (
    <Card
      title="Transactions by kind"
      error={kinds.error}
      busy={kinds.loading && data !== null}
      // The range the counts on screen were fetched for, not the filters', so
      // the bucket named matches the bars drawn while a new range loads.
      meta={<Meta {...(data ? kindsMeta(data.range, scope) : LOADING)} />}
      actions={<Legend items={LEGEND} />}
      variant="chart"
    >
      {data === null ? (
        <ChartSkeleton height={KINDS_CHART_HEIGHT} />
      ) : (
        <TxKindsChart data={data.counts} bucketSec={data.range.bucket} domain={data.domain} />
      )}
    </Card>
  );
}
