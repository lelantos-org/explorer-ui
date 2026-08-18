import { describe, expect, it } from "vitest";
import type { AssetOut, ChainFlow } from "../api";
import { decodeScope, EMPTY_SCOPE, encodeScope, groupAssetsByChain } from "./scope";

const asset = (chainId: number, assetIdU64: number): AssetOut => ({
  chainId,
  assetIdU64,
  tokenHex: "00",
  scale: "1",
  decimals: 18,
  symbol: null,
  priceUsd: null,
  priceAt: null,
});

const chain = (chainId: number): ChainFlow => ({
  chainId,
  inflow: 0,
  outflow: 0,
  hourlyIn: [],
  hourlyOut: [],
  txCount: 0,
});

describe("scope encoding", () => {
  it("round-trips the three selection states", () => {
    for (const s of [
      EMPTY_SCOPE,
      { chainId: 1, assetIdU64: null },
      { chainId: 1, assetIdU64: 7 },
    ]) {
      expect(decodeScope(encodeScope(s))).toEqual(s);
    }
  });

  it("uses the wire format the picker's option values carry", () => {
    expect(encodeScope({ chainId: 1, assetIdU64: 7 })).toBe("1:7");
    expect(encodeScope({ chainId: 1, assetIdU64: null })).toBe("1:");
    expect(encodeScope(EMPTY_SCOPE)).toBe("");
  });

  it("drops an asset with no chain, which is not addressable", () => {
    // assetIdU64 is only unique within a chain.
    expect(decodeScope(":7")).toEqual(EMPTY_SCOPE);
  });

  it("reads the picker value as ids, not as the text it arrived as", () => {
    expect(decodeScope("01:07")).toEqual({ chainId: 1, assetIdU64: 7 });
  });

  it("refuses a non-numeric id rather than passing NaN to the API", () => {
    expect(decodeScope("abc:7")).toEqual(EMPTY_SCOPE);
    expect(decodeScope("1:abc")).toEqual({ chainId: 1, assetIdU64: null });
  });
});

describe("groupAssetsByChain", () => {
  it("sorts chains and their assets by id", () => {
    const groups = groupAssetsByChain([asset(10, 2), asset(1, 5), asset(1, 3)], null);
    expect(groups.map((g) => g.chainId)).toEqual([1, 10]);
    expect(groups[0]?.assets.map((a) => a.assetIdU64)).toEqual([3, 5]);
  });

  it("keeps a chain that reports activity but owns no assets", () => {
    // Otherwise the picker hides a chain the grid above it is showing.
    const groups = groupAssetsByChain([], [chain(42161)]);
    expect(groups).toEqual([{ chainId: 42161, assets: [] }]);
  });

  it("is empty while both requests are still in flight", () => {
    expect(groupAssetsByChain(null, null)).toEqual([]);
  });
});
