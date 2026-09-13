import type { ReactNode } from "react";
import "./charts.css";
import { fmtNum, fmtTs } from "@/lib/format";
import { crisp, ticks as makeTicks, timeTicks } from "./chartLib";
import type { ChartBox } from "./useChartGeometry";
import type { PlotFrame } from "./usePlotFrame";

interface Props {
  /** The coordinate system the caller projected its series with. */
  frame: PlotFrame;
  /** From `usePlotFrame`: the box whose width the frame was measured from. */
  containerRef?: ChartBox["ref"];
  /** Accessible name for the plot. */
  title: string;
  yTickCount?: number;
  xTickCount?: number;
  /** Round the y ticks — for counts, where "2.5 transactions" is not a value. */
  roundY?: boolean;
  defs?: ReactNode;
  /** What the hovered bucket holds, in words. The legend itself lives in the
   *  card header; this row is only the readout, and keeps its height when
   *  empty so the plot does not jump as the pointer enters it. */
  readout?: ReactNode;
  /** The series, already positioned through `frame`. */
  children: ReactNode;
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave?: () => void;
}

/** Room one date label needs, with a gap either side, in pixels. */
const X_TICK_SPACE = 64;

/** As many x ticks as asked for, but no more than the plot has room to print
 *  apart — on a phone six dates ran into one unbroken string. */
const fitTicks = (wanted: number, width: number): number =>
  Math.max(2, Math.min(wanted, Math.floor(width / X_TICK_SPACE) + 1));

/**
 * Axes, gridlines and the hover readout around a plot.
 *
 * The series themselves come in as children, already positioned. Frame and
 * children scale through the same `frame`, so an axis label can never describe
 * a different mapping than the line drawn under it.
 */
export default function ChartFrame({
  frame,
  containerRef,
  title,
  yTickCount = 4,
  xTickCount = 6,
  roundY = false,
  defs,
  readout,
  children,
  onMouseMove,
  onMouseLeave,
}: Props) {
  const { geom, domain, span, max, x, y } = frame;
  const { W, H, pad } = geom;

  return (
    <div className="chart" ref={containerRef}>
      <div className="chart__readout">{readout}</div>
      {/* The viewBox matches the rendered size, so nothing is scaled: strokes
          and labels keep the widths they are declared with. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="chart__svg"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        role="img"
      >
        <title>{title}</title>
        {defs && <defs>{defs}</defs>}

        {makeTicks(yTickCount, max, roundY).map((v) => (
          <g key={`y-${v}`}>
            <line x1={pad.l} x2={W - pad.r} y1={crisp(y(v))} y2={crisp(y(v))} className="grid" />
            <text x={pad.l - 8} y={Math.round(y(v)) + 3} textAnchor="end" className="axis">
              {fmtNum(v)}
            </text>
          </g>
        ))}

        {children}

        {timeTicks(domain, fitTicks(xTickCount, geom.iw)).map((ts) => (
          <text
            key={`x-${ts}`}
            x={Math.round(x(ts))}
            y={H - 8}
            textAnchor="middle"
            className="axis"
          >
            {fmtTs(ts, span)}
          </text>
        ))}
      </svg>
    </div>
  );
}
