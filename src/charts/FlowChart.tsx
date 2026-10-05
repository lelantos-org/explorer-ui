import { memo, useCallback, useMemo } from "react";
import type { FlowPoint } from "@/api";
import { LABEL_DX, labelBaselines } from "@/charts/geometry/directLabels";
import { fillUrl, pathArea, pathLine, splitOpenTail } from "@/charts/geometry/path";
import { SERIES_PAD } from "@/charts/geometry/scale";
import { useChartHover } from "@/charts/hooks/useChartHover";
import { usePlotFrame } from "@/charts/hooks/usePlotFrame";
import ChartCursor from "@/charts/primitives/ChartCursor";
import ChartDot from "@/charts/primitives/ChartDot";
import ChartFrame from "@/charts/primitives/ChartFrame";
import ChartGradients from "@/charts/primitives/ChartGradients";
import { amountFmt, amounts, type Denom, isUsd } from "@/domain/denom";
import { fmtTs, isOpenBucket, type TimeDomain } from "@/lib/time";
import Empty from "@/ui/Empty";

interface Props {
  data: FlowPoint[];
  /** Unit the series is plotted in; also picks the tooltip formatter. */
  denom: Denom;
  /** Bucket width in seconds, to tell whether the newest bucket is still
   *  filling. */
  bucketSec: number;
  domain?: TimeDomain | null;
  height?: number;
}

const GRADIENT_ID = "flowchart";

/** The plot's height in pixels; its skeleton is drawn at the same size. */
export const FLOW_CHART_HEIGHT = 280;

const tsOf = (p: FlowPoint) => p.ts;

function FlowChart({ data, denom, bucketSec, domain, height = FLOW_CHART_HEIGHT }: Props) {
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

  const newest = data[data.length - 1];
  const open = !!newest && isOpenBucket(newest.ts, bucketSec, domain);

  // The path strings are the expensive part of a render, and a hover changes
  // nothing about them — so they are built once per series, not per mousemove.
  const paths = useMemo(() => {
    const lineIn = points.map((p) => ({ x: p.x, y: p.yIn }));
    const lineOut = points.map((p) => ({ x: p.x, y: p.yOut }));
    // An open bucket's endpoint is a partial figure, and at full weight the
    // line into it reads as a fall.
    const splitIn = splitOpenTail(lineIn, open);
    const splitOut = splitOpenTail(lineOut, open);
    return {
      areaIn: pathArea(lineIn, frame.baseline),
      areaOut: pathArea(lineOut, frame.baseline),
      lineIn: pathLine(splitIn.settled),
      lineOut: pathLine(splitOut.settled),
      openIn: pathLine(splitIn.tail),
      openOut: pathLine(splitOut.tail),
    };
  }, [points, frame.baseline, open]);

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
      {open && hovered.p === newest && " · so far"}
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
      {paths.openIn !== "" && (
        <g>
          <path d={paths.openOut} className="line line--out line--open" />
          <path d={paths.openIn} className="line line--in line--open" />
        </g>
      )}

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
