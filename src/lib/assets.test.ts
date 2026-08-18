import { describe, expect, it } from "vitest";
import type { AssetOut } from "../api";
import { assetKey, assetLabel, assetOptionLabel, assetsInScope, indexAssets } from "./assets";
import { EMPTY_SCOPE } from "./scope";

const asset = (symbol: string | null, chainId = 1, assetIdU64 = 1000): AssetOut => ({
  chainId,
  assetIdU64,
  tokenHex: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  scale: "1000000",
  decimals: 6,
  symbol,
  priceUsd: null,
  priceAt: null,
});

describe("assetLabel", () => {
  it("names an asset by its symbol when the indexer has one", () => {
    expect(assetLabel(asset("USDC"))).toBe("USDC");
  });

  it("falls back to the token address, never the registry id", () => {
    expect(assetLabel(asset(null))).toBe("0xa0b8…eb48");
  });
});

describe("assetOptionLabel", () => {
  it("keeps the address alongside the symbol, so two claimants stay tellable apart", () => {
    expect(assetOptionLabel(asset("USDC"))).toBe("USDC · 0xa0b8…eb48");
  });

  it("shows the address alone, not twice, when there is no symbol", () => {
    expect(assetOptionLabel(asset(null))).toBe("0xa0b8…eb48");
  });
});

describe("assetsInScope", () => {
  const registry = [asset("USDC", 1, 1000), asset("WETH", 1, 1001), asset("ARB", 42161, 1002)];

  it("counts the whole registry when nothing is pinned", () => {
    expect(assetsInScope(registry, EMPTY_SCOPE)).toHaveLength(3);
  });

  it("narrows to a chain, so a count beside a chain name means that chain", () => {
    const scoped = assetsInScope(registry, { chainId: 1, assetIdU64: null });
    expect(scoped?.map((a) => a.symbol)).toEqual(["USDC", "WETH"]);
  });

  it("narrows to the one pinned asset", () => {
    const scoped = assetsInScope(registry, { chainId: 1, assetIdU64: 1001 });
    expect(scoped?.map((a) => a.symbol)).toEqual(["WETH"]);
  });

  it("stays null while the registry is unloaded, which is not the same as empty", () => {
    expect(assetsInScope(null, { chainId: 1, assetIdU64: null })).toBeNull();
  });
});

describe("indexAssets", () => {
  it("keys by chain, since an assetIdU64 repeats across chains", () => {
    const map = indexAssets([asset("USDC", 1, 7), asset("WETH", 10, 7)]);
    expect(map.get(assetKey(1, 7))?.symbol).toBe("USDC");
    expect(map.get(assetKey(10, 7))?.symbol).toBe("WETH");
  });

  it("indexes an absent registry as empty rather than throwing", () => {
    expect(indexAssets(null).size).toBe(0);
  });
});
