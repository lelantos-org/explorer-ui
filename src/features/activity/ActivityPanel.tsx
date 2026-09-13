import type { AnonymitySet, AssetOut, TxOut } from "@/api";
import type { Async } from "@/data/useAsync";
import { KIND_FILTER_OPTIONS, type KindFilter } from "@/lib/kinds";
import Card from "@/ui/Card";
import { LOADING } from "@/ui/cardMeta";
import Meta from "@/ui/Meta";
import Segmented from "@/ui/Segmented";
import LatestTxList from "./LatestTxList";

interface Props {
  recentTx: Async<TxOut[]>;
  assets: AssetOut[] | null;
  cohorts: AnonymitySet[] | null;
  kind: KindFilter;
  onKindChange: (kind: KindFilter) => void;
}

/** The reference tab that changes minute to minute: the latest transactions. */
export default function ActivityPanel({ recentTx, assets, cohorts, kind, onKindChange }: Props) {
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
      meta={
        <Meta
          {...(recentTx.data
            ? { lead: `${recentTx.data.length} most recent · every chain` }
            : LOADING)}
        />
      }
    >
      <LatestTxList
        data={recentTx.data}
        assets={assets}
        cohorts={cohorts}
        loading={recentTx.loading}
        kind={kind}
      />
    </Card>
  );
}
