import { domainSpan, type TimeDomain } from "@/lib/time";
import { baselineY, type ChartGeometry, xScale, yScale } from "./scale";

/**
 * Everything a plot needs to place a value: the box, the window, and the two
 * scales that map into them.
 *
 * It is one object rather than a handful of loose values so the axes and the
 * series cannot be handed different ones — `ChartFrame` draws the gridlines
 * from the same `frame` the caller projected its points with, so a label can
 * never describe a mapping the line under it was not drawn with.
 */
export interface PlotFrame {
  geom: ChartGeometry;
  /** The window plotted. */
  domain: TimeDomain;
  /** Its width in seconds, floored at 1 so it is always safe to divide by. */
  span: number;
  /** Top of the y axis, floored at 1 for the same reason. */
  max: number;
  /** Unix seconds → x pixel. */
  x: (ts: number) => number;
  /** Value → y pixel. */
  y: (value: number) => number;
  /** The y the series rest on. */
  baseline: number;
}

/** The coordinate system for `domain` and values up to `max` inside `geom`. */
export function plotFrame(geom: ChartGeometry, domain: TimeDomain, max: number): PlotFrame {
  const top = Math.max(1, max);
  return {
    geom,
    domain,
    span: domainSpan(domain),
    max: top,
    x: xScale(geom, domain),
    y: yScale(geom, top),
    baseline: baselineY(geom),
  };
}
