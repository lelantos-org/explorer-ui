import type { PoolNotes as PoolNotesRow } from "../../api";
import { getChainMeta } from "../../lib/chains";
import { fmtAge } from "../../lib/format";
import Skeleton, { BarRows } from "../ui/Skeleton";

interface Props {
  data: PoolNotesRow[] | null;
  loading: boolean;
  selected: number | null;
  onSelect?: (chainId: number | null) => void;
}

/**
 * Commitment-tree occupancy, one row per chain.
 *
 * No total across chains, and no fill-against-capacity bar. Each chain has its
 * own tree, so the counts do not add — notes on Base are no cover on Arbitrum —
 * and a percentage-of-capacity reads as a privacy score when it is a capacity
 * figure. What a withdrawal is actually covered by is its denomination cohort,
 * one card up.
 */
export default function PoolNotes({ data, loading, selected, onSelect }: Props) {
  if (loading && !data) {
    return (
      <Skeleton>
        <BarRows count={3} widths={["40px", "64px", "140px", "28px"]} height={16} />
      </Skeleton>
    );
  }
  if (!data || data.length === 0) return <div className="empty">no notes committed yet</div>;

  return (
    <div className="notes">
      {data.map((c) => {
        const on = selected === c.chainId;
        // `leaves` counts every leaf; one per flushed deposit pays the relayer
        // that flushed it, so it is not a user's note and is not cover.
        const userNotes = c.leaves - c.feeNotes;
        // Counts are grouped rather than abbreviated, for the reason `plural`
        // gives: a count of things is read for its exact value where a
        // magnitude is not, and "1.2k" hides the gap between two chains.
        return (
          <button
            type="button"
            key={c.chainId}
            className={`notes__row ${on ? "notes__row--on" : ""}`}
            aria-pressed={on}
            onClick={() => onSelect?.(on ? null : c.chainId)}
          >
            <span className="notes__chain">{getChainMeta(c.chainId).short}</span>
            <span className="notes__val mono">{userNotes.toLocaleString()}</span>
            <span className="notes__sub muted">
              {c.leaves.toLocaleString()} leaves · {c.feeNotes.toLocaleString()} relayer
            </span>
            <span className="notes__age muted">{fmtAge(c.lastTs)}</span>
          </button>
        );
      })}
    </div>
  );
}
