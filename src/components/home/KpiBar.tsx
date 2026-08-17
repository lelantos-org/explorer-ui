import { amountFmt, type Denom, unitShort } from "../../lib/denom";
import { fmtBucket, fmtNum, joinMeta } from "../../lib/format";

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
  /** Scope the counts actually cover, when it is wider than the amounts'. The
   *  count endpoints take no asset, so a pinned asset narrows the flow tiles and
   *  not these two — unsaid, the row reads as one asset's transactions. */
  countScope?: string;
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

export default function KpiBar({
  inflow,
  outflow,
  txTotal,
  peak,
  bucketSec,
  denom,
  countScope,
}: Props) {
  const fmtAmount = amountFmt(denom);
  const amountUnit = unitShort(denom);
  const peakUnit = joinMeta([fmtBucket(bucketSec), countScope]);
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
      <Tile
        label="∑ transactions"
        unit={countScope}
        value={txTotal !== null ? fmtNum(txTotal) : dash}
      />
      <Tile
        // No arrow glyph: ▲/▼ mean direction on the flow tiles above, and a
        // peak is a magnitude.
        label="peak"
        unit={peakUnit}
        value={peak !== null ? fmtNum(peak) : dash}
      />
    </div>
  );
}
