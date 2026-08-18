import { useCallback, useMemo } from "react";
import type { FlowPoint } from "../../api";
import { amountFmt, amounts, type Denom, isUsd } from "../../lib/denom";
import { fmtTs } from "../../lib/format";
import type { TimeDomain } from "../../lib/time";
import ChartCursor from "./ChartCursor";
import ChartDot from "./ChartDot";
import ChartEmpty from "./ChartEmpty";
import ChartFrame from "./ChartFrame";
import ChartGradients, { fillUrl } from "./ChartGradients";
import { pathArea, pathLine } from "./chartLib";
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

const tsOf = (p: FlowPoint) => p.ts;

export default function FlowChart({ data, denom, domain, height = 280 }: Props) {
  // The axis fits whichever series the denomination selects, so switching
  // between tokens and dollars rescales the plot with the numbers on it.
  const valuesOf = useCallback(
    (p: FlowPoint) => {
      const v = amounts(p, denom);
      return [v.in, v.out];
    },
    [denom],
  );

  const { ref, frame } = usePlotFrame(data, { height, domain, tsOf, valuesOf });

  const points = useMemo(
    () =>
      data.map((p) => {
        const v = amounts(p, denom);
        return { x: frame.x(p.ts), yIn: frame.y(v.in), yOut: frame.y(v.out), v, p };
      }),
    [data, denom, frame],
  );

  const { point: hovered, handlers } = useChartHover(frame.geom, points);

  if (data.length === 0) return <ChartEmpty />;

  const fmt = amountFmt(denom);
  const lineIn = points.map((p) => ({ x: p.x, y: p.yIn }));
  const lineOut = points.map((p) => ({ x: p.x, y: p.yOut }));
  const first = points[0];

  const legend = (
    <>
      <span className="lg lg--in">
        <span className="lg__sw" /> inflow
      </span>
      <span className="lg lg--out">
        <span className="lg__sw" /> outflow
      </span>
      {hovered && (
        <span className="muted chart__tip">
          {fmtTs(hovered.p.ts, frame.span)} · <span className="accent">in {fmt(hovered.v.in)}</span>{" "}
          · <span className="warn">out {fmt(hovered.v.out)}</span>
          {hovered.p.unpricedAssets > 0 && isUsd(denom) && (
            <span className="warn"> · {hovered.p.unpricedAssets} unpriced</span>
          )}
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      frame={frame}
      containerRef={ref}
      title="Inflow and outflow over time"
      defs={<ChartGradients id={GRADIENT_ID} />}
      legend={legend}
      {...handlers}
    >
      <path d={pathArea(lineOut, frame.baseline)} fill={fillUrl(GRADIENT_ID, "out")} />
      <path d={pathArea(lineIn, frame.baseline)} fill={fillUrl(GRADIENT_ID, "in")} />
      <path d={pathLine(lineOut)} className="line line--out" />
      <path d={pathLine(lineIn)} className="line line--in" />

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
