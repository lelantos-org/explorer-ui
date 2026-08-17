import { domainSpan, type TimeDomain } from "../../lib/time";

export interface ChartPad {
  l: number;
  r: number;
  t: number;
  b: number;
}

// Left gutter fits the widest y-axis label (exponent form, e.g. "1.80e19").
export const DEFAULT_PAD: ChartPad = { l: 72, r: 16, t: 18, b: 28 };

export interface ChartGeometry {
  W: number;
  H: number;
  pad: ChartPad;
  /** Inner plot width and height, i.e. the box inside the padding. */
  iw: number;
  ih: number;
}

/** `W` is the container's measured pixel width, so that one user unit is one
 *  CSS pixel — see `useChartGeometry`. */
export function geometry(H: number, W: number, pad: ChartPad = DEFAULT_PAD): ChartGeometry {
  return { W, H, pad, iw: W - pad.l - pad.r, ih: H - pad.t - pad.b };
}

/** The y coordinate a series rests on. */
export function baselineY(g: ChartGeometry): number {
  return g.pad.t + g.ih;
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
  const span = domainSpan(domain);
  return (ts: number) => g.pad.l + ((ts - domain.start) / span) * g.iw;
}

export function yScale(g: ChartGeometry, max: number) {
  const safeMax = Math.max(1, max);
  return (v: number) => g.pad.t + g.ih - (v / safeMax) * g.ih;
}

/** Positional x scale for series with no time axis, e.g. a sparkline. */
export function indexScale(g: ChartGeometry, count: number) {
  const step = count > 1 ? g.iw / (count - 1) : 0;
  return (i: number) => g.pad.l + i * step;
}

/**
 * Evenly spaced tick values from 0 to `max`. Rounding can collapse neighbours
 * onto the same value (max=1, count=4 → 0,0,1,1,1); dedupe so each gridline is
 * drawn and labelled once, and so the value identifies the tick.
 */
export function ticks(count: number, max: number, round = false): number[] {
  const values = Array.from({ length: count + 1 }, (_, i) => {
    const v = (max * i) / count;
    return round ? Math.round(v) : v;
  });
  return round ? [...new Set(values)] : values;
}

/**
 * Snap an axis-aligned coordinate onto a pixel centre.
 *
 * A 1px stroke at a whole coordinate straddles the boundary between two pixels
 * and is drawn as two half-lit rows; half a pixel over, it covers one row
 * exactly. Only worth doing for horizontal and vertical hairlines — on a
 * diagonal it would move the line without sharpening it.
 */
export function crisp(v: number): number {
  return Math.round(v) + 0.5;
}

export function timeTicks(domain: TimeDomain, count = 6): number[] {
  const span = domain.end - domain.start;
  return Array.from({ length: count + 1 }, (_, i) => domain.start + (span * i) / count);
}

export function nearestPointIndex<T extends { x: number }>(
  points: T[],
  xPx: number,
): number | null {
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

export interface Point {
  x: number;
  y: number;
}

export function pathLine(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

/** `pathLine` closed down to a baseline, for the fill under a series. An empty
 *  series has no baseline to close against — emit nothing rather than a path
 *  that opens with a stray L. */
export function pathArea(points: Point[], baseline: number): string {
  if (points.length === 0) return "";
  const last = points[points.length - 1];
  const first = points[0];
  return `${pathLine(points)} L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`;
}
