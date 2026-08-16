import type { ChainFlow } from "../../api";
import { chainShares } from "../../lib/aggregate";
import ChainFlowCard from "./ChainFlowCard";

interface Props {
  data: ChainFlow[] | null;
  selected?: number | null;
  onSelect?: (chainId: number | null) => void;
}

export default function ChainFlowGrid({ data, selected, onSelect }: Props) {
  if (data === null) {
    return (
      <div className="chain-grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="chain-card chain-card--ghost" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="empty">no chain activity in last 24h</div>;
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
