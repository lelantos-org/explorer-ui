import { useMemo } from "react";
import { domainSpan, type TimeDomain } from "../../lib/time";
import {
  baselineY,
  type ChartGeometry,
  type ChartPad,
  resolveDomain,
  xScale,
  yScale,
} from "./chartLib";
import { type ChartBox, useChartGeometry } from "./useChartGeometry";

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

export interface PlotOpts<T> {
  height: number;
  /** The window to plot. Omitted, it is taken from the data's own extent — but
   *  a caller that knows the requested range should pass it, so an empty tail
   *  still shows as empty rather than being cropped away. */
  domain?: TimeDomain | null;
  /**
   * Bucket timestamp of a row, and every value it plots — the axis fits the
   * tallest of them.
   *
   * Both must be stable across renders (module-level functions, not inline
   * arrows), since the frame is memoised on them.
   */
  tsOf: (row: T) => number;
  valuesOf: (row: T) => number[];
  pad?: ChartPad;
}

/**
 * Measure the container and derive the plot's coordinate system from it.
 *
 * Returns the container ref alongside the frame: a chart attaches the ref to
 * the element it fills, and the next render's frame is built from the measured
 * width. See `useChartGeometry` for why charts draw at their measured size
 * rather than in a fixed space that is stretched to fit.
 */
export function usePlotFrame<T>(
  data: T[],
  { height, domain, tsOf, valuesOf, pad }: PlotOpts<T>,
): { ref: ChartBox["ref"]; frame: PlotFrame } {
  const { ref, geom } = useChartGeometry(height, pad);

  const frame = useMemo<PlotFrame>(() => {
    const dom = resolveDomain(data, tsOf, domain);
    const max = Math.max(1, ...data.flatMap(valuesOf));
    return {
      geom,
      domain: dom,
      span: domainSpan(dom),
      max,
      x: xScale(geom, dom),
      y: yScale(geom, max),
      baseline: baselineY(geom),
    };
  }, [data, domain, geom, tsOf, valuesOf]);

  return { ref, frame };
}
