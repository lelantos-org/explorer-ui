import { useMemo } from "react";
import type { FlowPoint } from "../../api";
import { amountFmt, amounts, type Denom, isUsd } from "../../lib/denom";
import { fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import ChartCursor from "./ChartCursor";
import ChartDot from "./ChartDot";
import ChartFrame from "./ChartFrame";
import { baselineY, pathArea, pathLine, resolveDomain, xScale, yScale } from "./chartLib";
import { useChartGeometry } from "./useChartGeometry";
import { useChartHover } from "./useChartHover";

interface Props {
  data: FlowPoint[];
  /** Unit the series is plotted in; also picks the tooltip formatter. */
  denom: Denom;
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
  </>
);

export default function FlowChart({ data, denom, domain, height = 280 }: Props) {
  const { ref, geom } = useChartGeometry(height);
  const view = useMemo(() => {
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const series = data.map((p) => ({ p, v: amounts(p, denom) }));
    const max = Math.max(1, ...series.map((s) => Math.max(s.v.in, s.v.out)));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    const points = series.map(({ p, v }) => ({ x: x(p.ts), yIn: y(v.in), yOut: y(v.out), v, p }));
    return { dom, max, points };
  }, [data, denom, geom, domain]);

  const { dom, max, points } = view;
  const { point: hoverPt, handlers } = useChartHover(geom, points);

  if (data.length === 0) return <div className="empty">no data</div>;

  const baseline = baselineY(geom);
  const lineIn = points.map((p) => ({ x: p.x, y: p.yIn }));
  const lineOut = points.map((p) => ({ x: p.x, y: p.yOut }));
  const fmt = amountFmt(denom);
  const span = domainSpan(dom);

  const legend = (
    <>
      <span className="lg lg--in">
        <span className="lg__sw" /> inflow
      </span>
      <span className="lg lg--out">
        <span className="lg__sw" /> outflow
      </span>
      {hoverPt && (
        <span className="muted chart__tip">
          {fmtTs(hoverPt.p.ts, span)} · <span className="accent">in {fmt(hoverPt.v.in)}</span> ·{" "}
          <span className="warn">out {fmt(hoverPt.v.out)}</span>
          {hoverPt.p.unpricedAssets > 0 && isUsd(denom) && (
            <span className="warn"> · {hoverPt.p.unpricedAssets} unpriced</span>
          )}
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
      title="Inflow and outflow over time"
      defs={Defs}
      legend={legend}
      {...handlers}
    >
      <path d={pathArea(lineOut, baseline)} fill="url(#outfill)" />
      <path d={pathArea(lineIn, baseline)} fill="url(#infill)" />
      <path d={pathLine(lineOut)} className="line line--out" />
      <path d={pathLine(lineIn)} className="line line--in" />

      {/* A single bucket draws a zero-length path, so mark the point itself. */}
      {points.length === 1 && (
        <g>
          <ChartDot x={points[0].x} y={points[0].yOut} series="out" />
          <ChartDot x={points[0].x} y={points[0].yIn} series="in" />
        </g>
      )}

      {hoverPt && (
        <ChartCursor geom={geom} x={hoverPt.x}>
          <ChartDot x={hoverPt.x} y={hoverPt.yIn} series="in" />
          <ChartDot x={hoverPt.x} y={hoverPt.yOut} series="out" />
        </ChartCursor>
      )}
    </ChartFrame>
  );
}
