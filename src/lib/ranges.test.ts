import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, isRangeLabel, RANGE_LABELS, RANGES, resolveRange } from "./ranges";

describe("resolveRange", () => {
  it("resolves every label the picker offers", () => {
    for (const label of RANGE_LABELS) {
      expect(resolveRange(label).label).toBe(label);
    }
  });

  it("falls back to the default rather than leaving the page without a range", () => {
    // `?range=` is user-editable, and an unknown one must not blank the charts.
    for (const bad of ["", "1y", "abc", null, undefined]) {
      expect(resolveRange(bad)).toBe(DEFAULT_RANGE);
    }
  });

  it("returns the same object for a label, so it is stable as a hook dependency", () => {
    expect(resolveRange("7d")).toBe(resolveRange("7d"));
  });
});

describe("range table", () => {
  it("lists every label once, in picker order", () => {
    expect(RANGES.map((r) => r.label)).toEqual([...RANGE_LABELS]);
  });

  it("buckets every range into a plottable number of points", () => {
    for (const range of RANGES) {
      const buckets = range.sec / range.bucket;
      expect(Number.isInteger(buckets)).toBe(true);
      // Enough to show a shape, few enough that the bars stay separable.
      expect(buckets).toBeGreaterThanOrEqual(24);
      expect(buckets).toBeLessThanOrEqual(96);
    }
  });
});

describe("isRangeLabel", () => {
  it("narrows URL text, which is not a label just because it is present", () => {
    expect(isRangeLabel("30d")).toBe(true);
    expect(isRangeLabel("30D")).toBe(false);
    expect(isRangeLabel(null)).toBe(false);
  });
});
