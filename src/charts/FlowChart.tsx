import { memo, useCallback, useMemo } from "react";
import type { FlowPoint } from "@/api";
import { amountFmt, amounts, type Denom, isUsd } from "@/lib/denom";
import { fmtTs } from "@/lib/format";
import type { TimeDomain } from "@/lib/time";
import Empty from "@/ui/Empty";
import ChartCursor from "./ChartCursor";
import ChartDot from "./ChartDot";
import ChartFrame from "./ChartFrame";
import ChartGradients from "./ChartGradients";
import { fillUrl, pathArea, pathLine, SERIES_PAD } from "./chartLib";
import { LABEL_DX, labelBaselines } from "./directLabels";
import { useChartHover } from "./useChartHover";
import { usePlotFrame } from "./usePlotFrame";

interface Props {
  data: FlowPoint[];
  /** Unit the series is plotted in; also picks the tooltip formatter. */
  denom: Denom;
  domain?: TimeDomain | null;
  height?: number;
}

const GRADIENT_ID = "flowchart";

/** The plot's height in pixels; its skeleton is drawn at the same size. */
export const FLOW_CHART_HEIGHT = 280;

const tsOf = (p: FlowPoint) => p.ts;

function FlowChart({ data, denom, domain, height = FLOW_CHART_HEIGHT }: Props) {
  // The axis fits whichever series the denomination selects, so switching
  // between tokens and dollars rescales the plot with the numbers on it.
  const valuesOf = useCallback(
    (p: FlowPoint) => {
      const v = amounts(p, denom);
      return [v.in, v.out];
    },
    [denom],
  );

  const { ref, frame } = usePlotFrame(data, { height, domain, tsOf, valuesOf, pad: SERIES_PAD });

  const points = useMemo(
    () =>
      data.map((p) => {
        const v = amounts(p, denom);
        return { x: frame.x(p.ts), yIn: frame.y(v.in), yOut: frame.y(v.out), v, p };
      }),
    [data, denom, frame],
  );

  // The path strings are the expensive part of a render, and a hover changes
  // nothing about them — so they are built once per series, not per mousemove.
  const paths = useMemo(() => {
    const lineIn = points.map((p) => ({ x: p.x, y: p.yIn }));
    const lineOut = points.map((p) => ({ x: p.x, y: p.yOut }));
    return {
      areaIn: pathArea(lineIn, frame.baseline),
      areaOut: pathArea(lineOut, frame.baseline),
      lineIn: pathLine(lineIn),
      lineOut: pathLine(lineOut),
    };
  }, [points, frame.baseline]);

  const { point: hovered, handlers } = useChartHover(frame.geom, points);

  if (data.length === 0) return <Empty />;

  const fmt = amountFmt(denom);
  const first = points[0];
  const last = points[points.length - 1];

  // Each series named at its own line end, as well as in the legend — the
  // chart-system rule for a pair that is only 7.5 ΔE apart for a deuteranope.
  const labels = last && labelBaselines(last.yIn, last.yOut, frame.geom.pad.t, frame.baseline);

  const readout = hovered && (
    <span className="chart__tip">
      {fmtTs(hovered.p.ts, frame.span)} ·{" "}
      <span className="chart__tip--in">in {fmt(hovered.v.in)}</span> ·{" "}
      <span className="chart__tip--out">out {fmt(hovered.v.out)}</span>
      {hovered.p.unpricedAssets > 0 && isUsd(denom) && (
        <span className="warn"> · {hovered.p.unpricedAssets} unpriced</span>
      )}
    </span>
  );

  return (
    <ChartFrame
      frame={frame}
      containerRef={ref}
      title="Inflow and outflow over time"
      defs={<ChartGradients id={GRADIENT_ID} />}
      readout={readout}
      {...handlers}
    >
      <path d={paths.areaIn} fill={fillUrl(GRADIENT_ID, "in")} />
      <path d={paths.areaOut} fill={fillUrl(GRADIENT_ID, "out")} />
      <path d={paths.lineOut} className="line line--out" />
      <path d={paths.lineIn} className="line line--in" />

      {last && labels && (
        <g>
          <text x={last.x + LABEL_DX} y={labels.a} className="direct direct--in">
            inflow
          </text>
          <text x={last.x + LABEL_DX} y={labels.b} className="direct direct--out">
            outflow
          </text>
        </g>
      )}

      {/* A single bucket draws a zero-length path, so mark the point itself. */}
      {points.length === 1 && first && (
        <g>
          <ChartDot x={first.x} y={first.yOut} series="out" />
          <ChartDot x={first.x} y={first.yIn} series="in" />
        </g>
      )}

      {hovered && (
        <ChartCursor frame={frame} x={hovered.x}>
          <ChartDot x={hovered.x} y={hovered.yIn} series="in" />
          <ChartDot x={hovered.x} y={hovered.yOut} series="out" />
        </ChartCursor>
      )}
    </ChartFrame>
  );
}

export default memo(FlowChart);
