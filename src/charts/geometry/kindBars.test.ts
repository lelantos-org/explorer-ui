import { describe, expect, it } from "vitest";
import type { KindCounts } from "@/api";
import { first } from "@/test/at";
import { layoutKindBars } from "./kindBars";
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

describe("layoutKindBars", () => {
  it("leaves a fixed 2px gap between neighbouring bars", () => {
    const { groups, barW } = layoutKindBars([bucket(DAY)], frame(), DAY);
    const bars = first(groups).bars;
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1];
      const cur = bars[i];
      if (!prev || !cur) throw new Error("missing bar");
      expect(cur.x - (prev.x + barW)).toBe(2);
    }
  });

  it("draws no bar for a zero count and a visible one for a count of one", () => {
    const bars = first(
      layoutKindBars([bucket(DAY, { deposit: 0, transfer: 1 })], frame(), DAY).groups,
    ).bars;
    expect(bars.find((b) => b.kind === "deposit")?.h).toBe(0);
    expect(bars.find((b) => b.kind === "transfer")?.h).toBeGreaterThan(0);
  });

  it("keeps the newest, half-elapsed bucket inside the plot", () => {
    const f = frame();
    const { groups, group } = layoutKindBars([bucket(29.9 * DAY)], f, DAY);
    const right = f.geom.W - f.geom.pad.r;
    expect(first(groups).x + group / 2).toBeLessThanOrEqual(right);
  });

  it("plots only the settled kinds, never pending", () => {
    const bars = first(layoutKindBars([bucket(DAY, { pending: 99 })], frame(), DAY).groups).bars;
    expect(bars.map((b) => b.kind)).not.toContain("pending");
  });
});
