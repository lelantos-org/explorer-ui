export interface ChartPad {
  l: number;
  r: number;
  t: number;
  b: number;
}

export const DEFAULT_PAD: ChartPad = { l: 56, r: 16, t: 18, b: 28 };
export const CHART_W = 1000;

export interface ChartGeometry {
  W: number;
  H: number;
  pad: ChartPad;
  iw: number;
  ih: number;
}

export function geometry(H: number, pad: ChartPad = DEFAULT_PAD): ChartGeometry {
  return {
    W: CHART_W,
    H,
    pad,
    iw: CHART_W - pad.l - pad.r,
    ih: H - pad.t - pad.b,
  };
}

export interface TimeDomain {
  start: number;
  end: number;
}

export function resolveDomain<T>(
  data: T[],
  tsOf: (t: T) => number,
  domain?: TimeDomain | null,
): TimeDomain {
  if (domain) return domain;
  const start = data[0] ? tsOf(data[0]) : 0;
  const end = data[data.length - 1] ? tsOf(data[data.length - 1]) : start + 1;
  return { start, end };
}

export function xScale(g: ChartGeometry, domain: TimeDomain) {
  const span = Math.max(1, domain.end - domain.start);
  return (ts: number) => g.pad.l + ((ts - domain.start) / span) * g.iw;
}

export function yScale(g: ChartGeometry, max: number) {
  const safeMax = Math.max(1, max);
  return (v: number) => g.pad.t + g.ih - (v / safeMax) * g.ih;
}

export function ticks(count: number, max: number, round = false): number[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const v = (max * i) / count;
    return round ? Math.round(v) : v;
  });
}

export function timeTicks(domain: TimeDomain, count = 6): number[] {
  const span = domain.end - domain.start;
  return Array.from({ length: count + 1 }, (_, i) => domain.start + (span * i) / count);
}

export function nearestPointIndex<T extends { x: number }>(points: T[], xPx: number): number | null {
  if (points.length === 0) return null;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(points[i].x - xPx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function pathLine(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export function pathArea(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) return "";
  const line = pathLine(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(2)} ${baselineY} L ${first.x.toFixed(2)} ${baselineY} Z`;
}
