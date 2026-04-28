import { fmtNum } from "../../lib/format";

interface Props {
  rangeLabel: string;
  assetCount: number | null;
  chainId: string;
  netFlow: number | null;
}

export default function Hero({ rangeLabel, assetCount, chainId, netFlow }: Props) {
  return (
    <div className="hero">
      <div className="hero__l">
        <div className="hero__eyebrow">// network observability</div>
        <h1 className="hero__t">
          <span className="accent">lelantos</span> <span className="muted">/</span> explorer
        </h1>
        <div className="hero__sub muted">
          zero-knowledge flow telemetry · {rangeLabel} window ·{" "}
          {assetCount ?? "—"} asset{assetCount === 1 ? "" : "s"}
          {chainId ? ` · chain ${chainId}` : ""}
        </div>
      </div>
      <div className="hero__r">
        <div className="kpi kpi--xl">
          <div className="kpi__lbl">net flow · {rangeLabel}</div>
          <div className={`kpi__val ${netFlow !== null && netFlow < 0 ? "warn" : "accent"}`}>
            {netFlow === null
              ? "···"
              : (netFlow >= 0 ? "+" : "−") + fmtNum(Math.abs(netFlow))}
          </div>
        </div>
      </div>
    </div>
  );
}
