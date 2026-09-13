import { memo, useMemo } from "react";
import type { AnonymitySet, AssetOut } from "@/api";
import { indexAssets } from "@/lib/assets";
import Empty from "@/ui/Empty";
import ScrollTable from "@/ui/ScrollTable";
import Skeleton from "@/ui/Skeleton";
import { SkeletonRows } from "@/ui/SkeletonRows";
import CohortRow from "./CohortRow";
import { COHORT_SKELETON_CELLS, CohortFoot, CohortHead } from "./CohortTableParts";
import { VISIBLE_ROWS, visibleCohorts } from "./visibleCohorts";
import "./CohortTable.css";

interface Props {
  data: AnonymitySet[] | null;
  /** Registry, used to name the asset a denomination belongs to. */
  assets: AssetOut[] | null;
  loading: boolean;
}

const LABEL = "withdrawal cover by denomination";

/**
 * Withdrawal cohorts, one row per denomination.
 *
 * An HTML table of bars rather than an SVG chart: the axis is categorical, the
 * labels are long, and the comparison a reader makes is between adjacent rows
 * rather than across a continuum.
 *
 * Ordered thinnest-first. Ascending by denomination would read more like a
 * ladder, but it buries the rows worth acting on — a set of one is the finding,
 * and it should not need scrolling to.
 */
function CohortTable({ data, assets, loading }: Props) {
  const byAsset = useMemo(() => indexAssets(assets), [assets]);
  const { rows, hidden, max } = useMemo(() => visibleCohorts(data), [data]);

  if (loading && !data) {
    return (
      <Skeleton className="sk-table">
        <ScrollTable label={LABEL} className="asets">
          <CohortHead />
          <tbody>
            <SkeletonRows rows={VISIBLE_ROWS} cells={COHORT_SKELETON_CELLS} />
          </tbody>
        </ScrollTable>
        <CohortFoot hidden={0} />
      </Skeleton>
    );
  }
  if (!data || data.length === 0) return <Empty>no withdrawals with a recorded denomination</Empty>;

  return (
    <>
      <ScrollTable label={LABEL} className="asets">
        <CohortHead />
        <tbody>
          {rows.map((set) => (
            <CohortRow
              key={`${set.chainId}-${set.assetIdU64}-${set.publicOut}`}
              set={set}
              max={max}
              byAsset={byAsset}
            />
          ))}
        </tbody>
      </ScrollTable>
      <CohortFoot hidden={hidden} />
    </>
  );
}

/** Memoised: the page re-renders on every poll, and structural sharing keeps
 *  `data` and `assets` the same references while nothing has changed. */
export default memo(CohortTable);
