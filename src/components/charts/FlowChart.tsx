import { useMemo } from "react";
import type { FlowPoint } from "../../api";
import { amountFmt, amounts, type Denom, isUsd } from "../../lib/denom";
import { fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import ChartFrame from "./ChartFrame";
import { baselineY, geometry, pathArea, pathLine, resolveDomain, xScale, yScale } from "./chartLib";
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
  const view = useMemo(() => {
    const geom = geometry(height);
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const series = data.map((p) => ({ p, v: amounts(p, denom) }));
    const max = Math.max(1, ...series.map((s) => Math.max(s.v.in, s.v.out)));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    const points = series.map(({ p, v }) => ({ x: x(p.ts), yIn: y(v.in), yOut: y(v.out), v, p }));
    return { geom, dom, max, points };
  }, [data, denom, height, domain]);

  const { geom, dom, max, points } = view;
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
          <circle cx={points[0].x} cy={points[0].yOut} r="3.5" className="chart__pt--out" />
          <circle cx={points[0].x} cy={points[0].yIn} r="3.5" className="chart__pt--in" />
        </g>
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
          <circle cx={hoverPt.x} cy={hoverPt.yIn} r="4" className="chart__pt--in" />
          <circle cx={hoverPt.x} cy={hoverPt.yOut} r="4" className="chart__pt--out" />
        </g>
      )}
    </ChartFrame>
  );
}
