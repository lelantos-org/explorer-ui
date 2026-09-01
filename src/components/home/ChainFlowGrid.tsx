import type { ChainFlow } from "../../api";
import { chainShares } from "../../lib/aggregate";
import Skeleton from "../ui/Skeleton";
import ChainFlowCard from "./ChainFlowCard";

interface Props {
  data: ChainFlow[] | null;
  selected?: number | null;
  onSelect?: (chainId: number | null) => void;
}

export default function ChainFlowGrid({ data, selected, onSelect }: Props) {
  if (data === null) {
    return (
      // Card-shaped rather than rows, so it keeps the grid layout — but it is
      // announced as one loading region like every other card's placeholder.
      <Skeleton className="chain-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="chain-card chain-card--ghost" aria-hidden="true" />
        ))}
      </Skeleton>
    );
  }

  // Every indexed chain is listed, quiet ones at zero, so an empty grid is not
  // a quiet day — it means nothing is being indexed at all.
  if (data.length === 0) {
    return <div className="empty">no chains indexed</div>;
  }

  const { hasValues, shareOf } = chainShares(data);

  return (
    <div className="chain-grid">
      {data.map((c) => {
        const isOn = selected === c.chainId;
        return (
          <ChainFlowCard
            key={c.chainId}
            flow={c}
            share={shareOf(c)}
            hasValues={hasValues}
            selected={isOn}
            onClick={() => onSelect?.(isOn ? null : c.chainId)}
          />
        );
      })}
    </div>
  );
}
