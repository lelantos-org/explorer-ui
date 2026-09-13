import type { IndexerState } from "@/data/indexerState";
import "./IndexerStatus.css";

const LABEL: Record<IndexerState, string> = {
  connecting: "connecting…",
  live: "indexer live",
  stale: "indexer stale",
  down: "indexer unreachable",
};

const TITLE: Record<IndexerState, string> = {
  connecting: "Waiting for the first response from the indexer.",
  live: "The last poll of the indexer succeeded.",
  stale: "The last poll failed. Figures on screen are from an earlier one.",
  down: "The indexer has not answered. Nothing on this page is current.",
};

/** The header chip. The word carries the state; the square only repeats it. */
export default function IndexerStatus({ state }: { state: IndexerState }) {
  return (
    <span className={`chip status status--${state}`} role="status" title={TITLE[state]}>
      <span className="status__sq" aria-hidden="true" />
      {LABEL[state]}
    </span>
  );
}
