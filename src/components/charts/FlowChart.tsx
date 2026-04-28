import { useMemo, useState } from "react";
import type { FlowPoint } from "../../api/types";
import { fmtNum, fmtTs } from "../../lib/format";
import ChartFrame from "./ChartFrame";
import {
  geometry,
  nearestPointIndex,
  pathArea,
  pathLine,
  resolveDomain,
  type TimeDomain,
  xScale,
  yScale,
} from "./chartLib";

interface Props {
  data: FlowPoint[];
  domain?: TimeDomain | null;
  height?: number;
}

const Defs = (
  <>
    <linearGradient id="infill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="outfill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor="var(--warn)" stopOpacity="0.30" />
      <stop offset="100%" stopColor="var(--warn)" stopOpacity="0" />
    </linearGradient>
    <filter id="glowIn" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.2" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="glowOut" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.6" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </>
);

export default function FlowChart({ data, domain, height = 280 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    const geom = geometry(height);
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const max = Math.max(1, ...data.map((d) => Math.max(d.in, d.out)));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    const points = data.map((p) => ({
      x: x(p.ts),
      yIn: y(p.in),
      yOut: y(p.out),
      p,
    }));
    return { geom, dom, max, points };
  }, [data, height, domain]);

  if (data.length === 0) return <div className="empty">no data</div>;

  const { geom, dom, max, points } = view;
  const baseline = geom.pad.t + geom.ih;

  const lineIn = points.map((p) => ({ x: p.x, y: p.yIn }));
  const lineOut = points.map((p) => ({ x: p.x, y: p.yOut }));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * geom.W;
    setHover(nearestPointIndex(points, xPx));
  };

  const hoverPt = hover !== null ? points[hover] : null;
  const span = dom.end - dom.start;

  const legend = (
    <>
      <span className="lg lg--in"><span className="lg__sw" /> inflow</span>
      <span className="lg lg--out"><span className="lg__sw" /> outflow</span>
      {hoverPt && (
        <span className="muted chart__tip">
          {fmtTs(hoverPt.p.ts, span)} ·{" "}
          <span className="accent">in {fmtNum(hoverPt.p.in)}</span> ·{" "}
          <span className="warn">out {fmtNum(hoverPt.p.out)}</span>
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      geom={geom}
      domain={dom}
      max={max}
      defs={Defs}
      legend={legend}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <path d={pathArea(lineOut, baseline)} fill="url(#outfill)" />
      <path d={pathArea(lineIn, baseline)} fill="url(#infill)" />
      <path d={pathLine(lineOut)} className="line line--out" filter="url(#glowOut)" />
      <path d={pathLine(lineIn)} className="line line--in" filter="url(#glowIn)" />

      {hoverPt && (
        <g>
          <line x1={hoverPt.x} x2={hoverPt.x} y1={geom.pad.t} y2={geom.H - geom.pad.b} className="cursor" />
          <circle cx={hoverPt.x} cy={hoverPt.yIn} r="4" className="dot--in" filter="url(#glowIn)" />
          <circle cx={hoverPt.x} cy={hoverPt.yOut} r="4" className="dot--out" filter="url(#glowOut)" />
        </g>
      )}
    </ChartFrame>
  );
}
