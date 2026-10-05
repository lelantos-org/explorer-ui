import { describe, expect, it } from "vitest";
import type { KindCounts } from "@/api";
import { first } from "@/test/at";
import { layoutKindBars, plottedTotal, type Segment } from "./kindBars";
import { plotFrame } from "./plotFrame";
import { geometry, SERIES_PAD } from "./scale";

const DAY = 86_400;

/** A 30-day plot 1000px wide, with counts up to 100. */
const frame = () => plotFrame(geometry(240, 1000, SERIES_PAD), { start: 0, end: 30 * DAY }, 100);

const bucket = (ts: number, over: Partial<KindCounts> = {}): KindCounts => ({
  ts,
  deposit: 10,
  pending: 0,
  transfer: 20,
  withdraw: 30,
  ...over,
});

const segmentsOf = (p: KindCounts): Segment[] =>
  first(layoutKindBars([p], frame(), DAY).stacks).segments;

/** Surface between each drawn segment and the one drawn above it. */
function gaps(segments: Segment[]): number[] {
  const drawn = segments.filter((s) => s.h > 0);
  return drawn.slice(1).map((upper, i) => {
    const lower = drawn[i];
    if (!lower) throw new Error("missing segment");
    return lower.y - (upper.y + upper.h);
  });
}

describe("layoutKindBars", () => {
  it("stacks the kinds bottom to top from the baseline", () => {
    const f = frame();
    const segments = segmentsOf(bucket(DAY));
    expect(segments.map((s) => s.kind)).toEqual(["deposit", "transfer", "withdraw"]);
    const bottom = first(segments);
    expect(bottom.y + bottom.h).toBe(f.baseline);
  });

  it("tops the bar at the bucket's total on the axis", () => {
    const f = frame();
    const p = bucket(DAY);
    const top = segmentsOf(p).at(-1);
    expect(Math.abs((top?.y ?? Number.NaN) - f.y(plottedTotal(p)))).toBeLessThanOrEqual(0.5);
  });

  it("leaves a fixed 2px gap between adjacent segments", () => {
    expect(gaps(segmentsOf(bucket(DAY)))).toEqual([2, 2]);
  });

  it("leaves one gap, not two, across a kind that saw nothing", () => {
    expect(gaps(segmentsOf(bucket(DAY, { transfer: 0 })))).toEqual([2]);
  });

  it("draws no segment for a zero count and a visible one for a count of one", () => {
    const f = frame();
    const segments = segmentsOf(bucket(DAY, { deposit: 0, transfer: 1 }));
    expect(segments.find((s) => s.kind === "deposit")?.h).toBe(0);
    const transfer = segments.find((s) => s.kind === "transfer");
    expect(transfer?.h).toBeGreaterThan(0);
    // Nothing below it, so it rests on the baseline rather than on a gap.
    expect((transfer?.y ?? 0) + (transfer?.h ?? 0)).toBe(f.baseline);
  });

  it("keeps the newest, half-elapsed bucket inside the plot", () => {
    const f = frame();
    const { stacks, barW } = layoutKindBars([bucket(29.9 * DAY)], f, DAY);
    const right = f.geom.W - f.geom.pad.r;
    expect(first(stacks).left + barW).toBeLessThanOrEqual(right);
  });

  it("plots only the settled kinds, never pending", () => {
    const p = bucket(DAY, { pending: 99 });
    expect(segmentsOf(p).map((s) => s.kind)).not.toContain("pending");
    expect(plottedTotal(p)).toBe(60);
  });
});
