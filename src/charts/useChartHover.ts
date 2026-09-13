import { useCallback, useState } from "react";
import { type ChartGeometry, nearestPointIndex } from "./chartLib";

export interface ChartHover<T> {
  /** The point under the cursor, or null when the cursor is away. */
  point: T | null;
  handlers: {
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
    onMouseLeave: () => void;
  };
}

/**
 * Snap the cursor to the nearest plotted point.
 *
 * The svg is drawn in viewBox units and stretched to fit, so a client x has to
 * be rescaled by the rendered width before it can be compared to point
 * coordinates.
 */
export function useChartHover<T extends { x: number }>(
  geom: ChartGeometry,
  points: T[],
): ChartHover<T> {
  const [index, setIndex] = useState<number | null>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
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
