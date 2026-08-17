import { useMemo } from "react";
import type { CountPoint } from "../../api";
import { fmtNum, fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import ChartCursor from "./ChartCursor";
import ChartDot from "./ChartDot";
import ChartFrame from "./ChartFrame";
import { baselineY, pathArea, pathLine, resolveDomain, xScale, yScale } from "./chartLib";
import { useChartGeometry } from "./useChartGeometry";
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
  const { ref, geom } = useChartGeometry(height);
  const view = useMemo(() => {
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const max = Math.max(1, ...data.map((d) => d.count));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    return { dom, max, points: data.map((p) => ({ x: x(p.ts), y: y(p.count), p })) };
  }, [data, geom, domain]);

  const { dom, max, points } = view;
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
      containerRef={ref}
      title="Transaction count over time"
      roundY
      defs={Defs}
      legend={legend}
      {...handlers}
    >
      <path d={pathArea(points, baselineY(geom))} fill="url(#txfill)" />
      <path d={pathLine(points)} className="line line--tx" />

      {/* A single bucket draws a zero-length path, so mark the point itself. */}
      {points.length === 1 && <ChartDot x={points[0].x} y={points[0].y} series="in" />}

      {hoverPt && (
        <ChartCursor geom={geom} x={hoverPt.x}>
          <ChartDot x={hoverPt.x} y={hoverPt.y} series="in" />
        </ChartCursor>
      )}
    </ChartFrame>
  );
}
