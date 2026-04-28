interface Props {
  in: number[];
  out: number[];
  height?: number;
}

export default function Sparkline({ in: inflow, out: outflow, height = 56 }: Props) {
  const W = 200;
  const H = height;
  const pad = 4;
  const max = Math.max(1, ...inflow, ...outflow);
  const n = Math.max(inflow.length, outflow.length);
  if (n === 0) return null;
  const step = (W - pad * 2) / Math.max(1, n - 1);
  const yOf = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"} ${(pad + i * step).toFixed(2)} ${yOf(v).toFixed(2)}`).join(" ");
  const area = (arr: number[]) => `${path(arr)} L ${(pad + (arr.length - 1) * step).toFixed(2)} ${H - pad} L ${pad.toFixed(2)} ${H - pad} Z`;

  const uid = `${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="spark">
      <defs>
        <linearGradient id={`spIn-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`spOut-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--warn)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--warn)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area(outflow)} fill={`url(#spOut-${uid})`} />
      <path d={area(inflow)} fill={`url(#spIn-${uid})`} />
      <path d={path(outflow)} className="spark__line spark__line--out" />
      <path d={path(inflow)} className="spark__line spark__line--in" />
    </svg>
  );
}
