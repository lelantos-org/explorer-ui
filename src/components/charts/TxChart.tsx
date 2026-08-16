import { useMemo } from "react";
import type { CountPoint } from "../../api";
import { fmtNum, fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import ChartFrame from "./ChartFrame";
import { baselineY, geometry, pathArea, pathLine, resolveDomain, xScale, yScale } from "./chartLib";
import { useChartHover } from "./useChartHover";

interface Props {
  data: CountPoint[];
  domain?: TimeDomain | null;
  height?: number;
}

const Defs = (
  <linearGradient id="txfill" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
  </linearGradient>
);

export default function TxChart({ data, domain, height = 240 }: Props) {
  const view = useMemo(() => {
    const geom = geometry(height);
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const max = Math.max(1, ...data.map((d) => d.count));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    return { geom, dom, max, points: data.map((p) => ({ x: x(p.ts), y: y(p.count), p })) };
  }, [data, height, domain]);

  const { geom, dom, max, points } = view;
  const { point: hoverPt, handlers } = useChartHover(geom, points);

  if (data.length === 0) return <div className="empty">no data</div>;

  const span = domainSpan(dom);

  const legend = (
    <>
      <span className="lg lg--tx">
        <span className="lg__sw" /> tx count
      </span>
      {hoverPt && (
        <span className="muted chart__tip">
          {fmtTs(hoverPt.p.ts, span)} · <span className="accent">{fmtNum(hoverPt.p.count)}</span> tx
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      geom={geom}
      domain={dom}
      max={max}
      title="Transaction count over time"
      roundY
      defs={Defs}
      legend={legend}
      {...handlers}
    >
      <path d={pathArea(points, baselineY(geom))} fill="url(#txfill)" />
      <path d={pathLine(points)} className="line line--tx" />

      {/* A single bucket draws a zero-length path, so mark the point itself. */}
      {points.length === 1 && (
        <circle cx={points[0].x} cy={points[0].y} r="3.5" className="chart__pt--in" />
      )}

      {hoverPt && (
        <g>
          <line
            x1={hoverPt.x}
            x2={hoverPt.x}
            y1={geom.pad.t}
            y2={geom.H - geom.pad.b}
            className="cursor"
          />
          <circle cx={hoverPt.x} cy={hoverPt.y} r="4" className="chart__pt--in" />
        </g>
      )}
    </ChartFrame>
  );
}
