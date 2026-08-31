import { amountFmt, type Denom, unitShort } from "../../lib/denom";
import { fmtNum } from "../../lib/format";

interface Props {
  inflow: number | null;
  outflow: number | null;
  txTotal: number | null;
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

export default function KpiBar({ inflow, outflow, txTotal, denom, countScope }: Props) {
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
      <Tile
        label="∑ commitments"
        unit={countScope}
        value={txTotal !== null ? fmtNum(txTotal) : dash}
      />
    </div>
  );
}
