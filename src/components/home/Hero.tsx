import { type Denom, signedFmt, unitShort } from "../../lib/denom";
import { plural } from "../../lib/format";

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
          {/* The count is still loading as `null`, which is a dash rather than
              a zero — "0 assets" would be a registry the backend never read. */}
          zero-knowledge flow telemetry · {rangeLabel} window ·{" "}
          {assetCount === null ? "— assets" : plural(assetCount, "asset")}
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
