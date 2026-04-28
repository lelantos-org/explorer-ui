import type { ChainFlow } from "../api/types";
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

  const totalIO = data.reduce((s, c) => s + c.inflow + c.outflow, 0);

  return (
    <div className="chain-grid">
      {data.map((c) => {
        const isOn = selected === c.chainId;
        const share = totalIO > 0 ? ((c.inflow + c.outflow) / totalIO) * 100 : 0;
        return (
          <ChainFlowCard
            key={c.chainId}
            flow={c}
            share={share}
            selected={isOn}
            onClick={() => onSelect?.(isOn ? null : c.chainId)}
          />
        );
      })}
    </div>
  );
}
