import { fmtNum } from "../../lib/format";

interface Props {
  inflow: number | null;
  outflow: number | null;
  txTotal: number | null;
  peakBucket: number | null;
}

function Tile({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="kpi">
      <div className="kpi__lbl">{label}</div>
      <div className={`kpi__val ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

const dash = "···";

export default function KpiBar({ inflow, outflow, txTotal, peakBucket }: Props) {
  return (
    <div className="kpis">
      <Tile label="▲ inflow" value={inflow !== null ? fmtNum(inflow) : dash} cls="accent" />
      <Tile label="▼ outflow" value={outflow !== null ? fmtNum(outflow) : dash} cls="warn" />
      <Tile label="∑ transactions" value={txTotal !== null ? fmtNum(txTotal) : dash} />
      <Tile label="peak / bucket" value={peakBucket !== null ? fmtNum(peakBucket) : dash} />
    </div>
  );
}
