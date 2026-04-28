import type { ChainFlow } from "../api/types";
import { fmtCompact, fmtSigned } from "../lib/format";
import { getChainMeta } from "../lib/chains";
import Sparkline from "./charts/Sparkline";

interface Props {
  flow: ChainFlow;
  share: number;
  selected: boolean;
  onClick: () => void;
}

export default function ChainFlowCard({ flow, share, selected, onClick }: Props) {
  const meta = getChainMeta(flow.chainId);
  const net = flow.inflow - flow.outflow;

  return (
    <button
      className={`chain-card ${selected ? "chain-card--on" : ""}`}
      onClick={onClick}
    >
      <div className="chain-card__top">
        <div>
          <div className="chain-card__short">{meta.short}</div>
          <div className="chain-card__name muted">{meta.name} · id {flow.chainId}</div>
        </div>
        <div className="chain-card__share">
          <div className="chain-card__share__bar">
            <div className="chain-card__share__fill" style={{ width: `${share.toFixed(1)}%` }} />
          </div>
          <div className="chain-card__share__lbl muted">{share.toFixed(1)}%</div>
        </div>
      </div>

      <div className="chain-card__nums">
        <Stat label="▲ in" value={fmtCompact(flow.inflow)} cls="accent" />
        <Stat label="▼ out" value={fmtCompact(flow.outflow)} cls="warn" />
        <Stat label="net" value={fmtSigned(net)} cls={net < 0 ? "warn" : "accent"} />
        <Stat label="tx" value={fmtCompact(flow.txCount)} />
      </div>

      <div className="chain-card__spark">
        <Sparkline in={flow.hourlyIn} out={flow.hourlyOut} />
      </div>
    </button>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="cn">
      <div className="cn__lbl">{label}</div>
      <div className={`cn__v ${cls ?? ""}`}>{value}</div>
    </div>
  );
}
