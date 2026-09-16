import { describe, expect, it } from "vitest";
import type { ChainLocked, LockedBasis } from "@/api";
import { summarizeLocked } from "./summary";

const locked = (
  chainId: number,
  lockedUsd: number | null,
  unpricedAssets = 0,
  bases: LockedBasis[] = [],
): ChainLocked => ({
  chainId,
  lockedUsd,
  unpricedAssets,
  assets: bases.map((basis, i) => ({
    assetIdU64: i,
    tokenHex: "aa",
    symbol: null,
    amount: 1,
    lockedUsd: null,
    lastTs: 0,
    basis,
  })),
});

describe("summarizeLocked", () => {
  it("totals the chains' dollars and carries what they exclude", () => {
    const summary = summarizeLocked([locked(1, 1000), locked(10, 250, 2)]);
    expect(summary).toEqual({ chains: 2, totalUsd: 1250, unpricedAssets: 2, venueHeldAssets: 0 });
  });

  it("skips a chain with no priced asset instead of counting it as zero", () => {
    const summary = summarizeLocked([locked(1, 1000), locked(10, null, 3)]);
    expect(summary?.totalUsd).toBe(1000);
    expect(summary?.chains).toBe(2);
    expect(summary?.unpricedAssets).toBe(3);
  });

  it("has no total at all when nothing anywhere could be priced", () => {
    // Not 0: an unpriceable pool is unknown, not empty.
    expect(summarizeLocked([locked(1, null, 1)])?.totalUsd).toBeNull();
  });

  /**
   * The count changes what the total *means*: a yield asset's balance is read
   * from its venue, so a total containing one is no longer "deposits minus
   * withdrawals". The caption keys off this, and cannot get it from the dollars.
   */
  it("counts the assets whose balance was measured rather than netted", () => {
    const summary = summarizeLocked([
      locked(1, 1000, 0, ["flowDifference", "venueHoldings"]),
      locked(10, 250, 0, ["venueHoldings"]),
    ]);
    expect(summary?.venueHeldAssets).toBe(2);
  });

  it("counts none when every balance came from flows", () => {
    const summary = summarizeLocked([locked(1, 1000, 0, ["flowDifference", "flowDifference"])]);
    expect(summary?.venueHeldAssets).toBe(0);
  });

  it("stays null while unloaded, and reports an empty network as empty", () => {
    expect(summarizeLocked(null)).toBeNull();
    expect(summarizeLocked([])).toEqual({
      chains: 0,
      totalUsd: null,
      unpricedAssets: 0,
      venueHeldAssets: 0,
    });
  });
});
