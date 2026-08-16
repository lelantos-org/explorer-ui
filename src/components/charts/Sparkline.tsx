import { useId } from "react";
import { baselineY, geometry, indexScale, pathArea, pathLine, yScale } from "./chartLib";

interface Props {
  in: number[];
  out: number[];
  height?: number;
}

const SPARK_W = 200;
const SPARK_PAD = { l: 4, r: 4, t: 4, b: 4 };

export default function Sparkline({ in: inflow, out: outflow, height = 56 }: Props) {
  // Gradient ids must be unique per instance but stable across renders.
  // useId embeds colons, which are awkward inside url(#…) — strip them.
  const uid = useId().replace(/:/g, "");

  const n = Math.max(inflow.length, outflow.length);
  if (n === 0) return null;

  const geom = geometry(height, SPARK_PAD, SPARK_W);
  const x = indexScale(geom, n);
  const y = yScale(geom, Math.max(1, ...inflow, ...outflow));
  const baseline = baselineY(geom);
  const project = (values: number[]) => values.map((v, i) => ({ x: x(i), y: y(v) }));

  const inPts = project(inflow);
  const outPts = project(outflow);

  return (
    <svg
      viewBox={`0 0 ${geom.W} ${geom.H}`}
      preserveAspectRatio="none"
      className="spark"
      role="img"
    >
      <title>Hourly activity, last 24h</title>
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
      <path d={pathArea(outPts, baseline)} fill={`url(#spOut-${uid})`} />
      <path d={pathArea(inPts, baseline)} fill={`url(#spIn-${uid})`} />
      <path d={pathLine(outPts)} className="spark__line spark__line--out" />
      <path d={pathLine(inPts)} className="spark__line spark__line--in" />
    </svg>
  );
}
