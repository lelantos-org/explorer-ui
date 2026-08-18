import { describe, expect, it } from "vitest";
import type { AssetOut } from "../../api";
import { resolveRange } from "../../lib/ranges";
import { EMPTY_SCOPE, type Scope } from "../../lib/scope";
import { chainsMeta, countScope, countsMeta, flowMeta, lockedMeta } from "./meta";

const range = resolveRange("30d");

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

const pinnedAsset: Scope = { chainId: 1, assetIdU64: 1000 };

describe("countScope", () => {
  it("says the counts are wider than the flows once an asset is pinned", () => {
    // /v1/tx-counts and /v1/tx-kinds take a chain and no asset, so unsaid the
    // row reads as one asset's transactions.
    expect(countScope(pinnedAsset)).toBe("all assets");
  });

  it("says nothing when the counts and the flows cover the same thing", () => {
    expect(countScope(EMPTY_SCOPE)).toBeUndefined();
    expect(countScope({ chainId: 1, assetIdU64: null })).toBeUndefined();
  });
});

describe("countsMeta", () => {
  it("names the bucket, and the wider scope when there is one", () => {
    expect(countsMeta(range, EMPTY_SCOPE)).toBe("bucket 1d");
    expect(countsMeta(range, pinnedAsset)).toBe("bucket 1d · all assets");
  });
});

describe("chainsMeta", () => {
  it("waits rather than reporting a total it does not have", () => {
    expect(chainsMeta(null)).toBe("loading…");
  });

  it("omits the reserved value fields rather than printing 0 as a measurement", () => {
    const meta = chainsMeta({ chains: 3, inflow: 0, outflow: 0, tx: 1200, hasValues: false });
    expect(meta).toBe("3 chains · 1.2k tx");
  });

  it("includes them once the backend reports any", () => {
    const meta = chainsMeta({ chains: 2, inflow: 5, outflow: 3, tx: 10, hasValues: true });
    expect(meta).toBe("2 chains · in 5 · out 3 · 10 tx");
  });
});

describe("flowMeta", () => {
  it("names a pinned asset by its symbol", () => {
    const meta = flowMeta(pinnedAsset, range, "tokens", [], [asset("USDC")]);
    expect(meta).toContain("asset USDC");
    expect(meta).toContain("chain 1");
  });

  it("says the token is unknown rather than naming it by registry id", () => {
    // The registry may not have loaded yet, or may not cover the chain.
    expect(flowMeta(pinnedAsset, range, "tokens", [], [])).toContain("asset unknown token");
  });

  it("says all assets when none is pinned, and drops the chain when unscoped", () => {
    const meta = flowMeta(EMPTY_SCOPE, range, "none", [], null);
    expect(meta).toContain("all assets");
    expect(meta).not.toContain("chain");
  });
});

describe("lockedMeta", () => {
  it("distinguishes an empty pool from one nothing could be priced in", () => {
    expect(lockedMeta({ chains: 0, totalUsd: null, unpricedAssets: 0 })).toBe("nothing escrowed");
    expect(lockedMeta({ chains: 2, totalUsd: null, unpricedAssets: 4 })).toContain(
      "2 chains · no usable prices",
    );
  });

  it("carries the count of assets its total leaves out", () => {
    const meta = lockedMeta({ chains: 2, totalUsd: 1500, unpricedAssets: 1 });
    expect(meta).toContain("$1.5k across 2 chains");
    expect(meta).toContain("1 unpriced asset excluded");
  });

  it("says nothing about exclusions when the total covers everything", () => {
    expect(lockedMeta({ chains: 1, totalUsd: 10, unpricedAssets: 0 })).not.toContain("unpriced");
  });
});
