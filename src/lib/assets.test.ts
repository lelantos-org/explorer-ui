import { describe, expect, it } from "vitest";
import type { AssetOut } from "../api";
import { assetLabel } from "./assets";

const asset = (symbol: string | null): AssetOut => ({
  chainId: 1,
  assetIdU64: 1000,
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

  it("has no label for an asset outside the loaded registry", () => {
    expect(assetLabel(undefined)).toBeNull();
  });
});
