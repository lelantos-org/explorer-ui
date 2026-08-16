import { amountFmt, type Denom, unitShort } from "../../lib/denom";
import { fmtBucket, fmtNum } from "../../lib/format";

interface Props {
  inflow: number | null;
  outflow: number | null;
  txTotal: number | null;
  /** Transactions in the busiest single bucket of the range. */
  peak: number | null;
  /** Bucket width the peak was measured over. It is the tile's unit — "peak"
   *  means nothing without the window it peaked in. */
  bucketSec: number;
  /** Unit of the amount tiles; the two count tiles are always plain numbers. */
  denom: Denom;
}

function Tile({
  label,
  value,
  cls,
  unit,
}: {
  label: string;
  value: string;
  cls?: string;
  unit?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi__lbl">
        {label}
        {unit && <span className="muted"> · {unit}</span>}
      </div>
      <div className={`kpi__val ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

const dash = "···";

export default function KpiBar({ inflow, outflow, txTotal, peak, bucketSec, denom }: Props) {
  const fmtAmount = amountFmt(denom);
  const amountUnit = unitShort(denom);
  return (
    <div className="kpis">
      <Tile
        label="▲ inflow"
        unit={amountUnit}
        value={inflow !== null ? fmtAmount(inflow) : dash}
        cls="accent"
      />
      <Tile
        label="▼ outflow"
        unit={amountUnit}
        value={outflow !== null ? fmtAmount(outflow) : dash}
        cls="warn"
      />
      <Tile label="∑ transactions" value={txTotal !== null ? fmtNum(txTotal) : dash} />
      <Tile
        // No arrow glyph: ▲/▼ mean direction on the flow tiles above, and a
        // peak is a magnitude.
        label="peak"
        unit={fmtBucket(bucketSec)}
        value={peak !== null ? fmtNum(peak) : dash}
      />
    </div>
  );
}
