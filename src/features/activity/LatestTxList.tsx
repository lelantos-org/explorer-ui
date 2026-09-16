import { memo, useMemo } from "react";
import type { AnonymitySet, AssetOut, TxOut } from "@/api";
import { indexAssets } from "@/domain/assets";
import type { KindFilter } from "@/domain/kinds";
import { indexCohorts } from "@/domain/txPrivacy";
import { useNow } from "@/hooks/useNow";
import Empty from "@/ui/Empty";
import ScrollTable from "@/ui/ScrollTable";
import Skeleton, { SkeletonRows } from "@/ui/Skeleton";

import { FEED_LIMIT, txRowKey } from "./feed";
import { FEED_SKELETON_CELLS, FeedHead, FeedNote } from "./LatestTxListParts";
import TxRow from "./TxRow";
import "./LatestTxList.css";

interface Props {
  data: TxOut[] | null;
  /** Registry, used to name the asset a row moved: its symbol when the indexer
   *  has one, its address otherwise. */
  assets: AssetOut[] | null;
  /** Cohort sizes per denomination, joined onto the withdrawals to say how much
   *  cover each one got. Null while loading: the column then reports unknown
   *  rather than guessing a k. */
  cohorts: AnonymitySet[] | null;
  loading: boolean;
  /** The kind the feed is pinned to. Named in the empty state so a filter with
   *  no matches never reads as a dead chain. */
  kind: KindFilter;
}

/** How often the rows' ages are recomputed. Ages print in whole seconds under
 *  a minute and in minutes above it, and the feed itself polls on the page's
 *  interval, so a finer clock would re-render twenty rows to change nothing. */
const AGE_TICK_MS = 15_000;

const LABEL = "latest transactions";

/** The classified feed, newest first, every chain. */
function LatestTxList({ data, assets, cohorts, loading, kind }: Props) {
  // Indexed once per response rather than per render: the cohort table can
  // hold a thousand rows, and the page re-renders on every poll.
  const byAsset = useMemo(() => indexAssets(assets), [assets]);
  const byDenom = useMemo(() => indexCohorts(cohorts), [cohorts]);
  const now = useNow(AGE_TICK_MS);

  if (loading && !data) {
    return (
      <Skeleton className="sk-table">
        <ScrollTable label={LABEL}>
          <FeedHead />
          <tbody>
            <SkeletonRows rows={FEED_LIMIT} cells={FEED_SKELETON_CELLS} />
          </tbody>
        </ScrollTable>
        <FeedNote />
      </Skeleton>
    );
  }
  if (!data || data.length === 0) return <Empty>no recent {kind && `${kind} `}activity</Empty>;

  return (
    <>
      <ScrollTable label={LABEL}>
        <FeedHead />
        <tbody>
          {data.map((tx) => (
            <TxRow key={txRowKey(tx)} tx={tx} byAsset={byAsset} cohorts={byDenom} now={now} />
          ))}
        </tbody>
      </ScrollTable>
      <FeedNote />
    </>
  );
}

export default memo(LatestTxList);
