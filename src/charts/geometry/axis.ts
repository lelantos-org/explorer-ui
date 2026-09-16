import type { TimeDomain } from "@/lib/time";

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

export function timeTicks(domain: TimeDomain, count = 6): number[] {
  const span = domain.end - domain.start;
  return Array.from({ length: count + 1 }, (_, i) => domain.start + (span * i) / count);
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
