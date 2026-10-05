import { describe, expect, it } from "vitest";
import type { ChainLocked, LockedAsset, LockedBasis } from "@/api";
import { assetShare, heldInScope, summarizeLocked } from "./summary";

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

describe("heldInScope", () => {
  const network = [locked(1, 1000, 1, ["flowDifference"]), locked(10, 250)];

  it("totals every chain's dollars when nothing is pinned", () => {
    expect(heldInScope(network, { chainId: null, assetIdU64: null })).toEqual({
      unit: "usd",
      value: 1250,
      unpricedAssets: 1,
    });
  });

  it("narrows to the pinned chain", () => {
    expect(heldInScope(network, { chainId: 10, assetIdU64: null })).toEqual({
      unit: "usd",
      value: 250,
      unpricedAssets: 0,
    });
  });

  it("reads a pinned asset in its own tokens", () => {
    expect(heldInScope(network, { chainId: 1, assetIdU64: 0 })).toEqual({
      unit: "tokens",
      value: 1,
      unpricedAssets: 0,
    });
  });

  it("is unknown, not zero, for an asset the escrow has no row for", () => {
    expect(heldInScope(network, { chainId: 1, assetIdU64: 99 })?.value).toBeNull();
    expect(heldInScope(network, { chainId: 5, assetIdU64: null })?.value).toBeNull();
  });

  it("stays null while unloaded", () => {
    expect(heldInScope(null, { chainId: null, assetIdU64: null })).toBeNull();
  });
});

describe("assetShare", () => {
  const asset = (lockedUsd: number | null): LockedAsset => ({
    assetIdU64: 1,
    tokenHex: "aa",
    symbol: null,
    amount: 1,
    lockedUsd,
    lastTs: 0,
    basis: "flowDifference",
  });

  it("is the asset's fraction of the priced total", () => {
    expect(assetShare(asset(250), 1000)).toBe(0.25);
  });

  it("has no share without a price on either side", () => {
    expect(assetShare(asset(null), 1000)).toBeNull();
    expect(assetShare(asset(250), null)).toBeNull();
  });

  it("has no share of a pool that nets to nothing, or for a negative balance", () => {
    expect(assetShare(asset(250), 0)).toBeNull();
    expect(assetShare(asset(-5), 1000)).toBeNull();
  });
});
