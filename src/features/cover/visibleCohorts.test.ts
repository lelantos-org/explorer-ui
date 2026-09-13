import { describe, expect, it } from "vitest";
import { cohortRow } from "@/test/fixtures";
import { fill, VISIBLE_ROWS, visibleCohorts } from "./visibleCohorts";

describe("visibleCohorts", () => {
  it("keeps the thinnest cohorts and counts the rest", () => {
    const data = Array.from({ length: VISIBLE_ROWS + 3 }, (_, i) =>
      cohortRow({ count: VISIBLE_ROWS + 3 - i, publicOut: String(i) }),
    );
    const { rows, hidden } = visibleCohorts(data);
    expect(rows).toHaveLength(VISIBLE_ROWS);
    expect(hidden).toBe(3);
    expect(rows[0]?.count).toBe(1);
  });

  it("scales against the widest row kept, not the widest in the data", () => {
    const data = [cohortRow({ count: 4, publicOut: "a" }), cohortRow({ count: 9, publicOut: "b" })];
    expect(visibleCohorts(data).max).toBe(9);
  });

  it("reads no data as no rows", () => {
    expect(visibleCohorts(null)).toEqual({ rows: [], hidden: 0, max: 1 });
  });
});

describe("fill", () => {
  it("is linear in the cohort size", () => {
    expect(fill(50, 100)).toBe(50);
  });

  it("keeps the thinnest bar visible", () => {
    expect(fill(1, 10_000)).toBeGreaterThan(0);
  });
});
