import type { KindCounts, TxKind } from "@/api";
import { PLOTTED_KINDS } from "@/lib/kinds";
import type { PlotFrame } from "./usePlotFrame";

/**
 * Where the kinds chart puts its bars: one group per bucket, a lane per kind.
 *
 * Pure geometry, apart from React, so the rules the design sets for the bars —
 * a fixed gap between neighbours, groups kept inside the plot, a visible mark
 * for a count of one — can be tested as numbers.
 */

/** Share of a bucket's slot the group of bars occupies; the rest is the gap
 *  between neighbouring buckets. */
const GROUP_FILL = 0.78;
/**
 * Surface showing between two bars of the same bucket, in pixels.
 *
 * Fixed rather than a share of the lane: it is there so adjacent kinds separate
 * by geometry as well as by hue (design/screens/chart-system, rule 02) — deposit
 * and withdraw are only 7.5 ΔE apart for a deuteranope — and a gap that shrank
 * with the lane would vanish on exactly the dense ranges where it is needed.
 */
const BAR_GAP = 2;
/** Bars stay legible when buckets are dense, and stop looking like slabs when
 *  a range holds only a couple of them. */
const MIN_BAR_W = 1;
const MAX_BAR_W = 9;
/** Corner radius, as the design draws them; never more than half a thin bar. */
export const BAR_R = 2;
/** A zero count draws nothing, but a count of 1 on a tall axis must still
 *  leave a visible mark. */
const MIN_BAR_H = 1.5;

export interface Bar {
  kind: TxKind;
  value: number;
  x: number;
  /** Height in pixels; 0 for a bucket where the kind saw nothing. */
  h: number;
}

export interface BarGroup {
  /** Centre of the group, which is also what the cursor snaps to. */
  x: number;
  bars: Bar[];
  p: KindCounts;
}

/** Bar and lane widths, in pixels. One slot per bucket *duration*, split into a
 *  lane per kind. */
function barLayout(frame: PlotFrame, bucketSec: number) {
  const laneRaw = ((bucketSec / frame.span) * frame.geom.iw * GROUP_FILL) / PLOTTED_KINDS.length;
  // Whole pixels: a fractional width leaves both edges of every bar half-lit,
  // which reads as a soft bar rather than a thin one.
  const barW = Math.round(Math.min(Math.max(laneRaw - BAR_GAP, MIN_BAR_W), MAX_BAR_W));
  const lane = barW + BAR_GAP;
  // The last lane's gap is outside the group, so the group centres on its bars.
  return { barW, lane, group: lane * PLOTTED_KINDS.length - BAR_GAP };
}

export interface KindBarsLayout {
  groups: BarGroup[];
  /** Width of every bar, in whole pixels. */
  barW: number;
  /** Width of a whole group, which the hover band spans. */
  group: number;
}

export function layoutKindBars(
  data: readonly KindCounts[],
  frame: PlotFrame,
  bucketSec: number,
): KindBarsLayout {
  const { barW, lane, group } = barLayout(frame, bucketSec);
  const left = frame.geom.pad.l;
  const right = frame.geom.W - frame.geom.pad.r;

  const groups = data.map((p): BarGroup => {
    // A bucket labelled at its start covers [ts, ts+bucket), so centre the
    // group on the middle of that span rather than on its left edge.
    const centre = frame.x(p.ts + bucketSec / 2);
    // Keep the group inside the plot: the newest bucket is usually only
    // half-elapsed, so its centre can sit past the right edge.
    const gx = Math.min(Math.max(centre - group / 2, left), right - group);
    const bars = PLOTTED_KINDS.map((kind: TxKind, i): Bar => {
      const value = p[kind];
      return {
        kind,
        value,
        x: Math.round(gx + i * lane),
        h: value > 0 ? Math.max(MIN_BAR_H, Math.round(frame.baseline - frame.y(value))) : 0,
      };
    });
    return { x: gx + group / 2, bars, p };
  });

  return { groups, barW, group };
}
