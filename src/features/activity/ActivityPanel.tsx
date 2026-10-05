import type { AnonymitySet, AssetOut, TxOut } from "@/api";
import type { Async } from "@/data/useAsync";
import { KIND_FILTER_OPTIONS, type KindFilter } from "@/domain/kinds";
import Button from "@/ui/Button";
import Card from "@/ui/Card";
import Meta from "@/ui/Meta";
import Segmented from "@/ui/Segmented";
import { nextFeedLimit } from "./feed";
import LatestTxList from "./LatestTxList";
import { activityMeta } from "./meta";

interface Props {
  recentTx: Async<TxOut[]>;
  assets: AssetOut[] | null;
  cohorts: AnonymitySet[] | null;
  kind: KindFilter;
  onKindChange: (kind: KindFilter) => void;
  /** How many rows the feed was asked for. */
  limit: number;
  onLimitChange: (limit: number) => void;
}

/** The reference tab that changes minute to minute: the latest transactions. */
export default function ActivityPanel({
  recentTx,
  assets,
  cohorts,
  kind,
  onKindChange,
  limit,
  onLimitChange,
}: Props) {
  const more = recentTx.data && nextFeedLimit(limit, recentTx.data.length);
  return (
    <Card
      title="Latest transactions"
      error={recentTx.error}
      busy={recentTx.loading && recentTx.data !== null}
      variant="table"
      // The kind sits on the card, not in the filter bar: this feed is global —
      // the bar's chain and range do not reach it — so a control up there would
      // read as narrowing a page it does not narrow.
      actions={
        <Segmented
          label="transaction kind"
          size="sm"
          options={KIND_FILTER_OPTIONS}
          value={kind}
          onChange={onKindChange}
        />
      }
      meta={<Meta {...activityMeta(recentTx.data)} />}
    >
      <LatestTxList
        data={recentTx.data}
        assets={assets}
        cohorts={cohorts}
        loading={recentTx.loading}
        kind={kind}
      />
      {more && (
        <div className="feed__more">
          <Button variant="ghost" disabled={recentTx.loading} onClick={() => onLimitChange(more)}>
            show {more - limit} more
          </Button>
        </div>
      )}
    </Card>
  );
}
