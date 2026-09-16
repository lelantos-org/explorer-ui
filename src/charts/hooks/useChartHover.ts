import { type MouseEvent, useCallback, useState } from "react";
import { type ChartGeometry, nearestPointIndex } from "@/charts/geometry/scale";

export interface ChartHover<T> {
  /** The point under the cursor, or null when the cursor is away. */
  point: T | null;
  handlers: {
    onMouseMove: (e: MouseEvent<SVGSVGElement>) => void;
    onMouseLeave: () => void;
  };
}

/**
 * Snap the cursor to the nearest plotted point.
 *
 * A client x is rescaled by the rendered width before it is compared to point
 * coordinates. The svg is drawn at its measured width, so the ratio is 1 — but
 * `.chart__svg` caps it at 100%, and a resize observed a frame late would
 * otherwise snap the cursor to the wrong bucket.
 */
export function useChartHover<T extends { x: number }>(
  geom: ChartGeometry,
  points: T[],
): ChartHover<T> {
  const [index, setIndex] = useState<number | null>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPx = ((e.clientX - rect.left) / rect.width) * geom.W;
      setIndex(nearestPointIndex(points, xPx));
    },
    [geom.W, points],
  );

  const onMouseLeave = useCallback(() => setIndex(null), []);

  // A held index can outlive the points it referred to when the query changes,
  // so resolve it defensively rather than trusting it.
  return {
    point: index === null ? null : (points[index] ?? null),
    handlers: { onMouseMove, onMouseLeave },
  };
}
