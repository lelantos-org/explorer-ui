import type { KindCounts, TxKind } from "@/api";
import { PLOTTED_KINDS } from "@/domain/kinds";
import type { PlotFrame } from "./plotFrame";

/**
 * Where the kinds chart puts its bars: one bar per bucket, a segment per kind.
 *
 * Pure geometry, apart from React, so the rules the design sets for the bars —
 * a fixed gap between adjacent fills, bars kept inside the plot, a visible mark
 * for a count of one — can be tested as numbers.
 */

/** Share of a bucket's slot the bar occupies; the rest is the gap between
 *  neighbouring buckets. */
const BAR_FILL = 0.78;
/**
 * Surface showing between two segments of the same bar, in pixels.
 *
 * Fixed rather than a share of the segment: it is there so adjacent kinds
 * separate by geometry as well as by hue (design/screens/chart-system, rule 02)
 * — deposit and withdraw are only 7.5 ΔE apart for a deuteranope, and they
 * touch whenever a bucket has no transfer between them.
 */
const SEGMENT_GAP = 2;
/** Bars stay legible when buckets are dense, and stop looking like slabs when
 *  a range holds only a couple of them. */
const MIN_BAR_W = 1;
const MAX_BAR_W = 24;
/** Corner radius, as the design draws them; never more than half a thin bar. */
export const BAR_R = 2;
/** A zero count draws nothing, but a count of 1 on a tall axis must still
 *  leave a visible mark. */
const MIN_SEGMENT_H = 2;
/** How far the hover band reaches past each side of the bar. */
const BAND_PAD = 3;

export interface Segment {
  kind: TxKind;
  value: number;
  /** Top edge, in pixels. */
  y: number;
  /** Height in pixels; 0 for a bucket where the kind saw nothing. */
  h: number;
}

export interface KindStack {
  /** Centre of the bar, which is also what the cursor snaps to. */
  x: number;
  /** Left edge of the bar, in whole pixels. */
  left: number;
  /** Bottom to top, in `PLOTTED_KINDS` order. */
  segments: Segment[];
  p: KindCounts;
}

/** What a bucket's bar adds up to, which is what the y axis has to fit. */
export function plottedTotal(p: KindCounts): number {
  return PLOTTED_KINDS.reduce((sum, kind) => sum + p[kind], 0);
}

/** Bar width in pixels, from one slot per bucket *duration*. */
function barWidth(frame: PlotFrame, bucketSec: number): number {
  const raw = (bucketSec / frame.span) * frame.geom.iw * BAR_FILL;
  // Whole pixels: a fractional width leaves both edges of every bar half-lit,
  // which reads as a soft bar rather than a thin one.
  return Math.round(Math.min(Math.max(raw, MIN_BAR_W), MAX_BAR_W));
}

export interface KindBarsLayout {
  stacks: KindStack[];
  /** Width of every bar, in whole pixels. */
  barW: number;
  /** Width of the hover band behind a bar. */
  band: number;
}

export function layoutKindBars(
  data: readonly KindCounts[],
  frame: PlotFrame,
  bucketSec: number,
): KindBarsLayout {
  const barW = barWidth(frame, bucketSec);
  const leftEdge = frame.geom.pad.l;
  const rightEdge = frame.geom.W - frame.geom.pad.r;

  const stacks = data.map((p): KindStack => {
    // A bucket labelled at its start covers [ts, ts+bucket), so centre the bar
    // on the middle of that span rather than on its left edge.
    const centre = frame.x(p.ts + bucketSec / 2);
    // Keep the bar inside the plot: the newest bucket is usually only
    // half-elapsed, so its centre can sit past the right edge.
    const left = Math.round(Math.min(Math.max(centre - barW / 2, leftEdge), rightEdge - barW));

    // Pixels above the baseline the stack has reached so far.
    let top = 0;
    let total = 0;
    const segments = PLOTTED_KINDS.map((kind): Segment => {
      const value = p[kind];
      if (value <= 0) return { kind, value, y: frame.baseline - top, h: 0 };
      total += value;
      // The gap is cut from the segment above it, so each boundary — and the
      // top of the bar — stays where the running total puts it on the axis.
      const bottom = top === 0 ? 0 : top + SEGMENT_GAP;
      const target = Math.round(frame.baseline - frame.y(total));
      const h = Math.max(MIN_SEGMENT_H, target - bottom);
      top = bottom + h;
      return { kind, value, y: frame.baseline - top, h };
    });

    return { x: left + barW / 2, left, segments, p };
  });

  return { stacks, barW, band: barW + 2 * BAND_PAD };
}
