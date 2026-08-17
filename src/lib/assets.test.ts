import { describe, expect, it } from "vitest";
import type { AssetOut } from "../api";
import { assetKey, assetLabel, assetOptionLabel, indexAssets } from "./assets";

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
