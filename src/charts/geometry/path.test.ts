import { describe, expect, it } from "vitest";
import { pathArea, pathLine } from "./path";

describe("paths", () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
  ];

  it("opens with a move and continues with lines", () => {
    expect(pathLine(pts)).toBe("M 0.00 0.00 L 10.00 5.00");
  });

  it("closes an area down to the baseline", () => {
    expect(pathArea(pts, 20)).toBe("M 0.00 0.00 L 10.00 5.00 L 10.00 20 L 0.00 20 Z");
  });

  it("emits nothing for an empty series rather than a stray L", () => {
    expect(pathArea([], 20)).toBe("");
  });
});
