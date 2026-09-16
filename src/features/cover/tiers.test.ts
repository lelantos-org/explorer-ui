import { describe, expect, it } from "vitest";
import { THIN_SET } from "@/domain/cover";
import { cohortRow } from "@/test/fixtures";
import { TIERS, tally } from "./tiers";

describe("tally", () => {
  it("counts each cohort into the tier its size earns", () => {
    const sets = [1, 1, THIN_SET - 1, THIN_SET, 500].map((count, i) =>
      cohortRow({ count, publicOut: String(i) }),
    );
    expect(tally(sets)).toEqual({ unique: 2, thin: 1, counted: 2 });
  });

  it("reports every tier, at zero when nothing is in it", () => {
    expect(tally([])).toEqual({ unique: 0, thin: 0, counted: 0 });
  });
});

describe("TIERS", () => {
  it("runs thinnest cover first, the order the table reads in", () => {
    expect(TIERS.map((t) => t.tone)).toEqual(["unique", "thin", "counted"]);
  });
});
