import { describe, expect, it } from "vitest";
import {
  baselineY,
  geometry,
  indexScale,
  nearestPointIndex,
  pathArea,
  pathLine,
  resolveDomain,
  ticks,
  xScale,
  yScale,
} from "./chartLib";

const geom = geometry(100, { l: 10, r: 10, t: 10, b: 10 }, 110);

describe("scales", () => {
  it("maps the domain onto the inner plot box", () => {
    const x = xScale(geom, { start: 0, end: 100 });
    expect(x(0)).toBe(10);
    expect(x(100)).toBe(100);
  });

  it("survives a zero-width domain rather than dividing by it", () => {
    const x = xScale(geom, { start: 5, end: 5 });
    expect(Number.isFinite(x(5))).toBe(true);
  });

  it("puts zero on the baseline and max at the top pad", () => {
    const y = yScale(geom, 50);
    expect(y(0)).toBe(baselineY(geom));
    expect(y(50)).toBe(geom.pad.t);
  });

  it("treats a max of zero as one, so an empty chart is not NaN", () => {
    expect(yScale(geom, 0)(0)).toBe(baselineY(geom));
  });

  it("collapses a single-point index scale onto the left edge", () => {
    expect(indexScale(geom, 1)(0)).toBe(10);
    expect(indexScale(geom, 3)(2)).toBe(100);
  });
});

describe("ticks", () => {
  it("spaces values evenly across the axis", () => {
    expect(ticks(4, 100)).toEqual([0, 25, 50, 75, 100]);
  });

  it("dedupes rounded ticks so a gridline is drawn once", () => {
    // Rounding collapses 0,0.25,0.5,0.75,1 onto 0,0,1,1,1.
    expect(ticks(4, 1, true)).toEqual([0, 1]);
  });
});

describe("resolveDomain", () => {
  it("prefers the caller's domain over the data's extent", () => {
    const given = { start: 5, end: 9 };
    expect(resolveDomain([{ ts: 100 }], (d) => d.ts, given)).toBe(given);
  });

  it("gives a single point a non-empty span to sit in", () => {
    expect(resolveDomain([{ ts: 7 }], (d) => d.ts)).toEqual({ start: 7, end: 7 });
    expect(resolveDomain([] as { ts: number }[], (d) => d.ts)).toEqual({ start: 0, end: 1 });
  });
});

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

describe("nearestPointIndex", () => {
  const pts = [{ x: 0 }, { x: 10 }, { x: 20 }];

  it("snaps to the closest point", () => {
    expect(nearestPointIndex(pts, 11)).toBe(1);
    expect(nearestPointIndex(pts, 100)).toBe(2);
  });

  it("has nothing to snap to on an empty chart", () => {
    expect(nearestPointIndex([], 5)).toBeNull();
  });
});
