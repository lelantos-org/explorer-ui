import type { ReactNode } from "react";
import { fmtNum, fmtTs } from "../../lib/format";
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
  legend?: ReactNode;
  /** The series, already positioned through `frame`. */
  children: ReactNode;
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave?: () => void;
}

/**
 * Axes, gridlines and legend around a plot.
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
  legend,
  children,
  onMouseMove,
  onMouseLeave,
}: Props) {
  const { geom, domain, span, max, x, y } = frame;
  const { W, H, pad } = geom;

  return (
    <div className="chart" ref={containerRef}>
      {legend && <div className="chart__legend">{legend}</div>}
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

        {timeTicks(domain, xTickCount).map((ts) => (
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
