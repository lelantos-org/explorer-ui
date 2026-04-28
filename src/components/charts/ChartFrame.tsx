import type { ReactNode } from "react";
import { fmtNum, fmtTs } from "../../lib/format";
import {
  type ChartGeometry,
  type TimeDomain,
  ticks as makeTicks,
  timeTicks,
} from "./chartLib";

interface Props {
  geom: ChartGeometry;
  domain: TimeDomain;
  max: number;
  yTickCount?: number;
  xTickCount?: number;
  roundY?: boolean;
  defs?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave?: () => void;
}

export default function ChartFrame({
  geom,
  domain,
  max,
  yTickCount = 4,
  xTickCount = 6,
  roundY = false,
  defs,
  legend,
  children,
  onMouseMove,
  onMouseLeave,
}: Props) {
  const { W, H, pad, iw, ih } = geom;
  const span = Math.max(1, domain.end - domain.start);
  const yOf = (v: number) => pad.t + ih - (v / Math.max(1, max)) * ih;
  const xOf = (ts: number) => pad.l + ((ts - domain.start) / span) * iw;

  const yTicks = makeTicks(yTickCount, max, roundY);
  const xTicks = timeTicks(domain, xTickCount);

  return (
    <div className="chart">
      {legend && <div className="chart__legend">{legend}</div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="chart__svg"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {defs && <defs>{defs}</defs>}

        {yTicks.map((v, i) => (
          <g key={`y-${i}`}>
            <line x1={pad.l} x2={W - pad.r} y1={yOf(v)} y2={yOf(v)} className="grid" />
            <text x={pad.l - 8} y={yOf(v) + 3} textAnchor="end" className="axis">
              {fmtNum(v)}
            </text>
          </g>
        ))}

        {children}

        {xTicks.map((ts, i) => (
          <text key={`x-${i}`} x={xOf(ts)} y={H - 8} textAnchor="middle" className="axis">
            {fmtTs(ts, span)}
          </text>
        ))}
      </svg>
    </div>
  );
}
