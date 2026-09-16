import { domainSpan, type TimeDomain } from "@/lib/time";

export interface ChartPad {
  l: number;
  r: number;
  t: number;
  b: number;
}

// Left gutter fits the widest y-axis label (exponent form, e.g. "1.80e19").
const DEFAULT_PAD: ChartPad = { l: 72, r: 16, t: 18, b: 28 };

/**
 * The page's two time-series charts, which are stacked and so share one plot
 * width: a right gutter for the flow chart's direct labels, kept on the kinds
 * chart too so the two x axes line up bucket for bucket.
 */
export const SERIES_PAD: ChartPad = { ...DEFAULT_PAD, r: 60 };

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

/**
 * The window to plot: the caller's if it has one, otherwise the data's own
 * extent.
 *
 * A caller that knows the range it requested should pass it — a series whose
 * last bucket is empty would otherwise be cropped to the buckets that came
 * back, so a quiet tail reads as a shorter range rather than a quiet one.
 */
export function resolveDomain<T>(
  data: T[],
  tsOf: (t: T) => number,
  domain?: TimeDomain | null,
): TimeDomain {
  if (domain) return domain;
  const first = data[0];
  const last = data[data.length - 1];
  // No data at all: a placeholder window, since there is nothing to take an
  // extent from. A single point yields a zero-width one, which is deliberate —
  // `domainSpan` floors the divisor, and widening it here would put the lone
  // point somewhere other than the left edge.
  if (first === undefined || last === undefined) return { start: 0, end: 1 };
  return { start: tsOf(first), end: tsOf(last) };
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

/** Index of the plotted point closest to a pixel x, or null when there are
 *  none to snap to. */
export function nearestPointIndex<T extends { x: number }>(
  points: T[],
  xPx: number,
): number | null {
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [i, point] of points.entries()) {
    const d = Math.abs(point.x - xPx);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
