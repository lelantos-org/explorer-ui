import { memo } from "react";
import type { ChainFlow } from "@/api";
import { toggleChain } from "@/domain/scope";
import Empty from "@/ui/Empty";
import Skeleton from "@/ui/Skeleton";
import ChainFlowCard from "./ChainFlowCard";
import { chainShares } from "./summary";
import "./ChainFlowGrid.css";

interface Props {
  data: ChainFlow[] | null;
  selected?: number | null;
  onSelect?: (chainId: number | null) => void;
}

function ChainFlowGrid({ data, selected = null, onSelect }: Props) {
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
  if (data.length === 0) return <Empty>no chains indexed</Empty>;

  const { hasValues, shareOf } = chainShares(data);

  return (
    <div className="chain-grid">
      {data.map((c) => (
        <ChainFlowCard
          key={c.chainId}
          flow={c}
          share={shareOf(c)}
          hasValues={hasValues}
          selected={selected === c.chainId}
          onClick={() => onSelect?.(toggleChain(selected, c.chainId))}
        />
      ))}
    </div>
  );
}

export default memo(ChainFlowGrid);
