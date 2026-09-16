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
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return "";
  return `${pathLine(points)} L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`;
}

/** Gradient id for a series within a namespace, as `url(#…)` wants it. */
export const fillUrl = (id: string, series: "in" | "out") => `url(#${id}-${series})`;
