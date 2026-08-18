import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { type ChartGeometry, type ChartPad, geometry } from "./chartLib";

/**
 * Width used until the container has been measured, and in environments with no
 * layout at all: geometry stays finite rather than collapsing to zero.
 */
const FALLBACK_W = 960;

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * There is no layout to read during a server render, and React warns about the
 * layout variant there — loudly, once per chart, over every test run. The
 * client keeps the layout timing, which is what puts the measured width into
 * the first paint.
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface ChartBox {
  /** Callback ref for the element the chart fills. */
  ref: (node: HTMLElement | null) => void;
  geom: ChartGeometry;
}

/**
 * Chart geometry in CSS pixels, tracking the container across resizes.
 *
 * Charts draw at their measured width rather than in a fixed coordinate space
 * that is later stretched to fit: one user unit is then one CSS pixel, so a 2px
 * stroke is 2px on screen and a 10px label is 10px, at every container size.
 * Measuring in a layout effect lands the real width in the first paint, so
 * nothing is drawn at the fallback size and then reflowed.
 *
 * `pad` must be a stable reference — a module constant, not an inline object.
 */
export function useChartGeometry(height: number, pad?: ChartPad): ChartBox {
  // A callback ref rather than a `useRef`, because a chart that renders an
  // empty state first attaches its container on a later render than its mount.
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!node) return;
    // Whole pixels only: a fractional coordinate space would put every gridline
    // and label back on a half pixel, which is the blur this avoids.
    const measure = () => setWidth(Math.round(node.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const geom = useMemo(
    () => geometry(height, width > 0 ? width : FALLBACK_W, pad),
    [height, width, pad],
  );

  return { ref: setNode, geom };
}
