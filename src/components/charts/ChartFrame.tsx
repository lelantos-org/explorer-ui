import type { ReactNode } from "react";
import { fmtNum, fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import { type ChartGeometry, ticks as makeTicks, timeTicks, xScale, yScale } from "./chartLib";

interface Props {
  geom: ChartGeometry;
  domain: TimeDomain;
  max: number;
  /** Accessible name for the plot. */
  title: string;
  yTickCount?: number;
  xTickCount?: number;
  roundY?: boolean;
  defs?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave?: () => void;
}

/**
 * Axes, gridlines and legend around a plot. The series themselves come in as
 * children, already positioned — the frame and its children scale through the
 * same `xScale`/`yScale`, so an axis label can never describe a different
 * mapping than the line drawn under it.
 */
export default function ChartFrame({
  geom,
  domain,
  max,
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
  const { W, H, pad } = geom;
  const span = domainSpan(domain);
  const x = xScale(geom, domain);
  const y = yScale(geom, max);

  return (
    <div className="chart">
      {legend && <div className="chart__legend">{legend}</div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="chart__svg"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        role="img"
      >
        <title>{title}</title>
        {defs && <defs>{defs}</defs>}

        {makeTicks(yTickCount, max, roundY).map((v) => (
          <g key={`y-${v}`}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" className="axis">
              {fmtNum(v)}
            </text>
          </g>
        ))}

        {children}

        {timeTicks(domain, xTickCount).map((ts) => (
          <text key={`x-${ts}`} x={x(ts)} y={H - 8} textAnchor="middle" className="axis">
            {fmtTs(ts, span)}
          </text>
        ))}
      </svg>
    </div>
  );
}
