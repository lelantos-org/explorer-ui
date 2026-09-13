import { describe, expect, it } from "vitest";
import type { AnonymitySet } from "@/api/types";
import { coverTone, isDormant, kLabel, THIN_SET, thinnestFirst } from "./cover";

const set = (over: Partial<AnonymitySet> = {}): AnonymitySet => ({
  chainId: 1,
  assetIdU64: 1000,
  publicOut: "500",
  count: 42,
  recentCount: 42,
  firstTs: 1,
  lastTs: 2,
  ...over,
});

describe("thinnestFirst", () => {
  it("leads with the sets that have the least cover", () => {
    const rows = [set({ count: 40 }), set({ count: 1 }), set({ count: 8 })];
    expect([...rows].sort(thinnestFirst).map((r) => r.count)).toEqual([1, 8, 40]);
  });

  it("breaks ties numerically rather than lexicographically", () => {
    // "1000" sorts below "200" as text, which would scramble a ladder.
    const rows = [set({ count: 3, publicOut: "1000" }), set({ count: 3, publicOut: "200" })];
    expect([...rows].sort(thinnestFirst).map((r) => r.publicOut)).toEqual(["200", "1000"]);
  });
});

describe("coverTone", () => {
  it("puts the boundary at THIN_SET itself", () => {
    expect(coverTone(THIN_SET - 1)).toBe("thin");
    expect(coverTone(THIN_SET)).toBe("counted");
  });

  it("treats an impossible count as no cover rather than throwing", () => {
    // A cohort is at least the withdrawal itself, so 0 should not arise — but
    // if it ever did, understating cover is the safe direction.
    expect(coverTone(0)).toBe("unique");
  });
});

describe("kLabel", () => {
  it("names a cohort of one instead of counting it", () => {
    expect(kLabel(1)).toContain("unique");
  });

  it("keeps larger counts exact rather than abbreviating them", () => {
    // "k = 1.2k" is both the wrong convention for a count and a confusing
    // second "k".
    expect(kLabel(1234)).toBe("k = 1,234");
  });
});

describe("isDormant", () => {
  it("is dormant only when nothing landed inside the window", () => {
    expect(isDormant(set({ count: 40, recentCount: 0 }))).toBe(true);
    expect(isDormant(set({ count: 40, recentCount: 1 }))).toBe(false);
  });

  it("treats an unreported window as unknown, not as dormant", () => {
    // A backend too old to measure the window has not told us the cohort went
    // quiet, and saying it did would invent a finding.
    expect(isDormant(set({ count: 40, recentCount: null }))).toBe(false);
  });

  /**
   * Dormancy is reported beside the tone, never folded into it. A cohort of 40
   * that has gone quiet still has 40 withdrawals behind it, and an anonymity set
   * is all-history by definition — calling it `thin` would redefine what thin
   * means and understate cover the user actually has.
   */
  it("does not change the tone a cohort's size earns", () => {
    const dormant = set({ count: 40, recentCount: 0 });
    expect(coverTone(dormant.count)).toBe("counted");
    expect(isDormant(dormant)).toBe(true);
  });
});
