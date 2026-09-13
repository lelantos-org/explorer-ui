import { describe, expect, it } from "vitest";
import type { AnonymitySet, TxKind, TxOut } from "@/api/types";
import { COHORT_LIMIT, coverTone, kLabel, THIN_SET } from "./cover";
import { cohortKey, indexCohorts, txPrivacy } from "./txPrivacy";

const tx = (kind: TxKind, over: Partial<TxOut> = {}): TxOut => ({
  chainId: 1,
  txHashHex: "ab".repeat(32),
  blockNumber: 100,
  blockTs: 1_700_000_000,
  kind,
  assetIdU64: kind === "transfer" ? null : 1000,
  amount: kind === "transfer" ? null : "10",
  publicOut: kind === "withdraw" ? "500" : null,
  ...over,
});

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

/** The cohorts a withdrawal of the default shape would find. */
const cohorts = (count: number) => indexCohorts([set({ count })]);

describe("indexCohorts", () => {
  it("keys on chain, asset and denomination together", () => {
    // An asset id is unique only within its chain, and a denomination only
    // within its asset: collapsing any of the three would merge two sets that
    // give each other no cover.
    const index = indexCohorts([
      set({ chainId: 1, count: 5 }),
      set({ chainId: 10, count: 9 }),
      set({ assetIdU64: 2000, count: 3 }),
      set({ publicOut: "1000", count: 7 }),
    ]);
    expect(index.byKey.get(cohortKey(1, 1000, "500"))?.count).toBe(5);
    expect(index.byKey.get(cohortKey(10, 1000, "500"))?.count).toBe(9);
    expect(index.byKey.get(cohortKey(1, 2000, "500"))?.count).toBe(3);
    expect(index.byKey.get(cohortKey(1, 1000, "1000"))?.count).toBe(7);
  });

  it("survives no cohorts at all", () => {
    expect(indexCohorts(null).byKey.size).toBe(0);
    expect(indexCohorts([]).byKey.size).toBe(0);
  });

  /**
   * A miss means two different things, so the lookup has to carry which. Not
   * loaded and truncated-at-the-cap both leave the size genuinely unknown; a
   * complete list that lacks a denomination only means the row is newer.
   */
  it("is complete only when the whole table is in hand", () => {
    expect(indexCohorts(null).complete).toBe(false);
    expect(indexCohorts([]).complete).toBe(true);
    const capped = Array.from({ length: COHORT_LIMIT }, (_, i) => set({ publicOut: `${i}` }));
    expect(indexCohorts(capped).complete).toBe(false);
    expect(indexCohorts(capped.slice(1)).complete).toBe(true);
  });
});

/** `txPrivacy` for a row that is expected to have a reading. */
const withdrawPrivacy = (over: Partial<TxOut>, count: number) => {
  const p = txPrivacy(tx("withdraw", over), cohorts(count));
  if (p === null) throw new Error("expected a withdrawal to carry a privacy reading");
  return p;
};

describe("txPrivacy", () => {
  /**
   * Only a withdrawal publishes a denomination, so only a withdrawal has a k.
   * The other kinds are not private by some other measure — there is no
   * anonymity set to report, and giving them a reading would put a verdict
   * where there is no measurement.
   */
  it("reports nothing for the kinds that publish no denomination", () => {
    for (const kind of ["transfer", "deposit", "pending"] as const) {
      expect(txPrivacy(tx(kind), cohorts(42))).toBeNull();
    }
  });

  it("reports a busy denomination with its cohort size", () => {
    const p = withdrawPrivacy({}, 42);
    expect(p.tone).toBe("counted");
    expect(p.k).toBe(42);
    expect(p.label).toBe("k = 42");
  });

  it("marks a cohort below the threshold as thin", () => {
    expect(withdrawPrivacy({}, THIN_SET - 1).tone).toBe("thin");
    expect(withdrawPrivacy({}, THIN_SET).tone).toBe("counted");
  });

  it("marks a cohort of one as unique", () => {
    // The case the card exists for: a publicOut nobody else published is
    // linkable to the deposit that funded it.
    const p = withdrawPrivacy({}, 1);
    expect(p.tone).toBe("unique");
    expect(p.k).toBe(1);
  });

  /**
   * The regression this file exists to prevent. `publicOut` is null for rows
   * indexed before the contract emitted the field, which means the denomination
   * is unknown — not that nobody else published it. Rendering that as `k = 0`
   * or as `unique` would accuse the pool of a leak the data does not show.
   */
  it("reports an unindexed denomination as unknown, not as a cohort of zero", () => {
    const p = withdrawPrivacy({ publicOut: null }, 42);
    expect(p.tone).toBe("unknown");
    expect(p.k).toBeNull();
    expect(p.label).not.toContain("0");
    expect(p.label).not.toContain("k =");
  });

  /**
   * The case that read as "not counted" on a live chain. The feed and the
   * cohort table are separate requests on separate caches, so a brand-new
   * denomination reaches the feed first. A complete list that lacks it is not
   * ignorance — the withdrawal in front of us publishes it, so k is at least 1.
   */
  it("says k >= 1 when a complete table is simply older than the row", () => {
    const p = withdrawPrivacy({ publicOut: "999999" }, 42);
    expect(p.label).toBe("k ≥ 1");
    // Muted, not toned as a finding: calling it unique on a stale snapshot
    // would raise an alarm a busy minute could disprove.
    expect(p.tone).toBe("unknown");
    expect(p.k).toBeNull();
  });

  it("stays silent about size when the table was truncated at the cap", () => {
    const capped = Array.from({ length: COHORT_LIMIT }, (_, i) => set({ publicOut: `c${i}` }));
    const p = txPrivacy(tx("withdraw", { publicOut: "999999" }), indexCohorts(capped));
    expect(p?.label).toBe("not counted");
    expect(p?.tone).toBe("unknown");
  });

  it("stays silent about size while the table is still loading", () => {
    const p = txPrivacy(tx("withdraw"), indexCohorts(null));
    expect(p?.label).toBe("not counted");
  });

  it("does not read one asset's cohort onto another's denomination", () => {
    expect(withdrawPrivacy({ assetIdU64: 2000 }, 42).tone).toBe("unknown");
  });
});

describe("txPrivacy recency", () => {
  it("omits the window from the tooltip when the backend reported none", () => {
    const p = txPrivacy(tx("withdraw"), indexCohorts([set({ count: 40, recentCount: null })]));
    expect(p?.label).toBe("k = 40");
    expect(p?.title).toContain("at most");
    expect(p?.title).not.toContain("recent");
    expect(p?.title).not.toContain("dormant");
    // No stray separator left where the recency clause would have been.
    expect(p?.title.trimEnd()).toBe(p?.title);
  });

  it("carries the recency into the tooltip, where the cell has no room", () => {
    const p = txPrivacy(tx("withdraw"), indexCohorts([set({ count: 40, recentCount: 3 })]));
    expect(p?.label).toBe("k = 40");
    expect(p?.title).toContain("3 of them are recent");
  });

  it("names a dormant cohort rather than reporting zero recent", () => {
    const p = txPrivacy(tx("withdraw"), indexCohorts([set({ count: 40, recentCount: 0 })]));
    expect(p?.title).toContain("dormant");
  });

  it("states the count is an upper bound on people, not a headcount", () => {
    // The whole of part C: k counts withdrawals, and one person exiting
    // repeatedly is indistinguishable from that many users.
    const p = txPrivacy(tx("withdraw"), indexCohorts([set({ count: 40 })]));
    expect(p?.title).toContain("at most");
  });
});

describe("txPrivacy tone", () => {
  /**
   * Why this is a shared function rather than a comparison in each component.
   * The cohort card colours its bar from `coverTone` and the feed's privacy
   * column takes its tone from `txPrivacy`; a row reading "thin" beside a bar
   * coloured as healthy would be worse than either alone.
   */
  it("agrees with the reading the feed gives the same count", () => {
    for (const count of [1, 2, THIN_SET - 1, THIN_SET, 500]) {
      const viaFeed = withdrawPrivacy({}, count);
      expect(viaFeed.tone).toBe(coverTone(count));
      expect(viaFeed.label).toBe(kLabel(count));
    }
  });
});
