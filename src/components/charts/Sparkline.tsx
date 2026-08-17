import { useId } from "react";
import { baselineY, type ChartPad, indexScale, pathArea, pathLine, yScale } from "./chartLib";
import { useChartGeometry } from "./useChartGeometry";

interface Props {
  in: number[];
  out: number[];
  height?: number;
}

const SPARK_PAD: ChartPad = { l: 4, r: 4, t: 4, b: 4 };

export default function Sparkline({ in: inflow, out: outflow, height = 56 }: Props) {
  // Gradient ids must be unique per instance but stable across renders.
  // useId embeds colons, which are awkward inside url(#…) — strip them.
  const uid = useId().replace(/:/g, "");
  const { ref, geom } = useChartGeometry(height, SPARK_PAD);

  const n = Math.max(inflow.length, outflow.length);
  if (n === 0) return null;

  const x = indexScale(geom, n);
  const y = yScale(geom, Math.max(1, ...inflow, ...outflow));
  const baseline = baselineY(geom);
  const project = (values: number[]) => values.map((v, i) => ({ x: x(i), y: y(v) }));

  const inPts = project(inflow);
  const outPts = project(outflow);

  return (
    <div className="spark" ref={ref}>
      {/* Drawn at the measured width rather than stretched from a fixed one:
          stretching widened the strokes horizontally but not vertically, so the
          line thinned out wherever it turned. */}
      <svg
        viewBox={`0 0 ${geom.W} ${geom.H}`}
        width={geom.W}
        height={geom.H}
        className="spark__svg"
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
    </div>
  );
}
