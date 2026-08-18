import { useId } from "react";
import ChartGradients, { fillUrl } from "./ChartGradients";
import { baselineY, type ChartPad, indexScale, pathArea, pathLine, yScale } from "./chartLib";
import { useChartGeometry } from "./useChartGeometry";

interface Props {
  in: number[];
  out: number[];
  height?: number;
}

const SPARK_PAD: ChartPad = { l: 4, r: 4, t: 4, b: 4 };

/** A bare hourly trace, with no axes, ticks or hover — the chain cards carry
 *  their figures beside it, so the shape is all this has to say. */
export default function Sparkline({ in: inflow, out: outflow, height = 56 }: Props) {
  // Gradient ids must be unique per instance but stable across renders: a page
  // holds one of these per chain card. useId embeds colons, which are awkward
  // inside url(#…) — strip them.
  const gradientId = `spark${useId().replace(/:/g, "")}`;
  const { ref, geom } = useChartGeometry(height, SPARK_PAD);

  const count = Math.max(inflow.length, outflow.length);
  if (count === 0) return null;

  const x = indexScale(geom, count);
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
          <ChartGradients id={gradientId} />
        </defs>
        <path d={pathArea(outPts, baseline)} fill={fillUrl(gradientId, "out")} />
        <path d={pathArea(inPts, baseline)} fill={fillUrl(gradientId, "in")} />
        <path d={pathLine(outPts)} className="spark__line spark__line--out" />
        <path d={pathLine(inPts)} className="spark__line spark__line--in" />
      </svg>
    </div>
  );
}
