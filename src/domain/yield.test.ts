import { describe, expect, it } from "vitest";
import { indexGrowth, indexRatio, isPolled } from "./yield";

/** One RAY, the value the index carries when a venue is freshly bound. */
const RAY = "1000000000000000000000000000";

describe("indexRatio", () => {
  it("reads one RAY as a rate of exactly one", () => {
    expect(indexRatio(RAY)).toBe(1);
  });

  it("scales a moved index down to a multiplier", () => {
    // 1.0342 RAY.
    expect(indexRatio("1034200000000000000000000000")).toBeCloseTo(1.0342, 10);
  });

  it("reports unknown for an unpolled asset rather than a rate of zero", () => {
    // A ratio of 0 would render as −100%, claiming the venue lost everything.
    expect(indexRatio(null)).toBe(null);
  });

  it("reports unknown for a value it cannot parse", () => {
    // NaN passes every null check downstream and prints "NaN%".
    expect(indexRatio("not-a-number")).toBe(null);
  });
});

describe("indexGrowth", () => {
  it("is zero at inception, when the index is one RAY", () => {
    expect(indexGrowth(RAY)).toBe(0);
  });

  it("is the return to date once the index has moved", () => {
    expect(indexGrowth("1034200000000000000000000000")).toBeCloseTo(0.0342, 10);
  });

  it("carries unknown through rather than reporting no growth", () => {
    expect(indexGrowth(null)).toBe(null);
  });
});

describe("isPolled", () => {
  it("separates a bound asset from a polled one", () => {
    // Bound but never reached: a normal state, not an error.
    expect(isPolled({ updatedAt: null })).toBe(false);
    expect(isPolled({ updatedAt: 1_700_000_000 })).toBe(true);
  });
});
