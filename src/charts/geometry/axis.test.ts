import { describe, expect, it } from "vitest";
import { crisp, ticks } from "./axis";

describe("ticks", () => {
  it("spaces values evenly across the axis", () => {
    expect(ticks(4, 100)).toEqual([0, 25, 50, 75, 100]);
  });

  it("dedupes rounded ticks so a gridline is drawn once", () => {
    // Rounding collapses 0,0.25,0.5,0.75,1 onto 0,0,1,1,1.
    expect(ticks(4, 1, true)).toEqual([0, 1]);
  });
});

describe("crisp", () => {
  it("puts a hairline on a pixel centre, from either side of it", () => {
    expect(crisp(20)).toBe(20.5);
    expect(crisp(20.4)).toBe(20.5);
    expect(crisp(20.6)).toBe(21.5);
  });
});
