import { describe, expect, it } from "vitest";
import { captionText, cohortRow, LOADING_TEXT } from "@/test/fixtures";
import { anonymityMeta } from "./meta";

const cohort = (count: number, publicOut = "500", recentCount = count) =>
  cohortRow({ count, publicOut, recentCount });

describe("anonymityMeta", () => {
  /**
   * The load-bearing claim on this card. An anonymity set is every withdrawal
   * of that denomination the pool has ever seen, so the card ignores the range
   * the rest of the page is filtered to. Unsaid, a reader takes the counts for
   * the selected window and reads every k as far smaller than it is.
   */
  it("says the counts cover all history, not the selected range", () => {
    expect(anonymityMeta([cohort(40)]).basis).toContain("all history");
  });

  /**
   * The upper-bound claim is stated in prose in exactly one place at card
   * level, and prose with no test rots silently.
   */
  it("says the counts are an upper bound, not a headcount", () => {
    expect(anonymityMeta([cohort(40)]).basis).toContain("at most");
  });

  it("counts dormant cohorts, naming the window", () => {
    const meta = anonymityMeta([cohort(40, "500", 0), cohort(40, "200", 4)]);
    expect(meta.gaps).toContain("1 dormant in 30d");
  });

  it("says nothing about dormancy when every cohort is active", () => {
    expect(captionText(anonymityMeta([cohort(40)]))).not.toContain("dormant");
  });

  it("counts how many sets are below the threshold", () => {
    const meta = anonymityMeta([cohort(1, "10"), cohort(4, "20"), cohort(90, "50")]);
    expect(meta.lead).toContain("3 denominations");
    expect(meta.gaps).toContain("2 below k=10");
  });

  it("says nothing about thin sets when none are", () => {
    expect(captionText(anonymityMeta([cohort(90)]))).not.toContain("below");
  });

  it("separates loading from having no denominations", () => {
    expect(anonymityMeta(null).lead).toBe(LOADING_TEXT);
    expect(anonymityMeta([]).lead).toBe("no denominations recorded");
  });
});
