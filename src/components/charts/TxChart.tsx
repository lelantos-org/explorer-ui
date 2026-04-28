import { useMemo, useState } from "react";
import type { CountPoint } from "../../api/types";
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
  data: CountPoint[];
  domain?: TimeDomain | null;
  height?: number;
}

const Defs = (
  <>
    <linearGradient id="txfill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
    </linearGradient>
    <filter id="txglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </>
);

export default function TxChart({ data, domain, height = 240 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    const geom = geometry(height);
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const max = Math.max(1, ...data.map((d) => d.count));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    const points = data.map((p) => ({ x: x(p.ts), y: y(p.count), p }));
    return { geom, dom, max, points };
  }, [data, height, domain]);

  if (data.length === 0) return <div className="empty">no data</div>;

  const { geom, dom, max, points } = view;
  const baseline = geom.pad.t + geom.ih;
  const span = dom.end - dom.start;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * geom.W;
    setHover(nearestPointIndex(points, xPx));
  };

  const hoverPt = hover !== null ? points[hover] : null;

  const legend = (
    <>
      <span className="lg lg--tx"><span className="lg__sw" /> tx count</span>
      {hoverPt && (
        <span className="muted chart__tip">
          {fmtTs(hoverPt.p.ts, span)} ·{" "}
          <span className="accent">{fmtNum(hoverPt.p.count)}</span> tx
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      geom={geom}
      domain={dom}
      max={max}
      roundY
      defs={Defs}
      legend={legend}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <path d={pathArea(points, baseline)} fill="url(#txfill)" />
      <path d={pathLine(points)} className="line line--tx" filter="url(#txglow)" />

      {hoverPt && (
        <g>
          <line x1={hoverPt.x} x2={hoverPt.x} y1={geom.pad.t} y2={geom.H - geom.pad.b} className="cursor" />
          <circle cx={hoverPt.x} cy={hoverPt.y} r="4" className="dot--in" filter="url(#txglow)" />
        </g>
      )}
    </ChartFrame>
  );
}
