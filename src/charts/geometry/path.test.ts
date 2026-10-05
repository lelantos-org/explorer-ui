import { describe, expect, it } from "vitest";
import { pathArea, pathLine, splitOpenTail } from "./path";

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

describe("splitOpenTail", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 5 };
  const c = { x: 20, y: 2 };

  it("ends the settled line one point early and starts the tail on it", () => {
    expect(splitOpenTail([a, b, c], true)).toEqual({ settled: [a, b], tail: [b, c] });
  });

  it("leaves a closed series whole", () => {
    expect(splitOpenTail([a, b, c], false)).toEqual({ settled: [a, b, c], tail: [] });
  });

  it("has no tail without a settled point to start from", () => {
    expect(splitOpenTail([a], true)).toEqual({ settled: [a], tail: [] });
  });
});
