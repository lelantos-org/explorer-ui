import { useMemo } from "react";
import { type PlotFrame, plotFrame } from "@/charts/geometry/plotFrame";
import { type ChartPad, resolveDomain } from "@/charts/geometry/scale";
import type { TimeDomain } from "@/lib/time";
import { type ChartBox, useChartGeometry } from "./useChartGeometry";

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

  const frame = useMemo(
    () =>
      plotFrame(geom, resolveDomain(data, tsOf, domain), Math.max(1, ...data.flatMap(valuesOf))),
    [data, domain, geom, tsOf, valuesOf],
  );

  return { ref, frame };
}
