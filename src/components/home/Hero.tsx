import { type Denom, signedFmt, unitShort } from "../../lib/denom";

interface Props {
  rangeLabel: string;
  /** Assets in scope; `null` while the registry is still loading. */
  assetCount: number | null;
  /** Chain in scope, or `null` for the whole network. */
  chainId: number | null;
  netFlow: number | null;
  /** Unit `netFlow` is expressed in. */
  denom: Denom;
}

export default function Hero({ rangeLabel, assetCount, chainId, netFlow, denom }: Props) {
  return (
    <div className="hero">
      <div className="hero__l">
        <div className="hero__eyebrow">{"// network observability"}</div>
        <h1 className="hero__t">
          <span className="accent">lelantos</span> <span className="muted">/</span> explorer
        </h1>
        <div className="hero__sub muted">
          zero-knowledge flow telemetry · {rangeLabel} window · {assetCount ?? "—"} asset
          {assetCount === 1 ? "" : "s"}
          {chainId !== null && ` · chain ${chainId}`}
        </div>
      </div>
      <div className="hero__r">
        <div className="kpi kpi--xl">
          <div className="kpi__lbl">
            net flow · {rangeLabel} <span className="muted">· {unitShort(denom)}</span>
          </div>
          <div className={`kpi__val ${netFlow !== null && netFlow < 0 ? "warn" : "accent"}`}>
            {netFlow === null ? "···" : signedFmt(denom)(netFlow)}
          </div>
        </div>
      </div>
    </div>
  );
}
