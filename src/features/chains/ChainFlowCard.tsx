import type { ChainFlow } from "@/api";
import Sparkline from "@/charts/Sparkline";
import { getChainMeta } from "@/lib/chains";
import { cx } from "@/lib/cx";
import { fmtCompact, fmtSigned } from "@/lib/format";
import "./ChainFlowCard.css";

interface Props {
  flow: ChainFlow;
  share: number;
  /** False when the backend reports no per-asset value yet (in/out all zero). */
  hasValues: boolean;
  selected: boolean;
  onClick: () => void;
}

/** One chain's last 24h: identity, its share of the network, its figures, and
 *  a sparkline. The whole card is a button that scopes the page to the chain. */
export default function ChainFlowCard({ flow, share, hasValues, selected, onClick }: Props) {
  const meta = getChainMeta(flow.chainId);
  const net = flow.inflow - flow.outflow;
  // The backend lists every chain it indexes, so 0 is a measurement: this chain
  // was scanned and saw nothing. Dimmed and named, rather than dropped from the
  // grid, where it would read as a chain nobody watches.
  const idle = flow.txCount === 0;

  return (
    <button
      type="button"
      className={cx("chain-card", selected && "chain-card--on", idle && "chain-card--idle")}
      title={idle ? "indexed, no transactions in the last 24h" : undefined}
      // Selecting a chain was signalled by border colour alone.
      aria-pressed={selected}
      onClick={onClick}
    >
      <div className="chain-card__top">
        <div>
          <div className="chain-card__short">{meta.short}</div>
          <div className="chain-card__name muted">
            {meta.name} · id {flow.chainId}
          </div>
        </div>
        <div className="chain-card__share">
          <div className="chain-card__share-bar">
            <div className="chain-card__share-fill" style={{ width: `${share.toFixed(1)}%` }} />
          </div>
          <div className="chain-card__share-lbl muted">
            {idle ? "idle · 24h" : `${share.toFixed(1)}% ${hasValues ? "vol" : "tx"}`}
          </div>
        </div>
      </div>

      <div className="chain-card__nums">
        {hasValues ? (
          <>
            <Figure label="▲ in" value={fmtCompact(flow.inflow)} tone="accent" />
            <Figure label="▼ out" value={fmtCompact(flow.outflow)} tone="warn" />
            <Figure label="net" value={fmtSigned(net)} tone={net < 0 ? "warn" : "accent"} />
            <Figure label="tx" value={fmtCompact(flow.txCount)} />
          </>
        ) : (
          <Figure label="tx · 24h" value={fmtCompact(flow.txCount)} tone="accent" />
        )}
      </div>

      <div className="chain-card__spark">
        <Sparkline in={flow.hourlyIn} out={hasValues ? flow.hourlyOut : []} />
      </div>
    </button>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "warn";
}) {
  return (
    <div className="chain-card__fig">
      <div className="chain-card__fig-lbl">{label}</div>
      <div className={cx("chain-card__fig-val num", tone)}>{value}</div>
    </div>
  );
}
