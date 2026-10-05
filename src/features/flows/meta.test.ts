import { describe, expect, it } from "vitest";
import { resolveRange } from "@/domain/ranges";
import { EMPTY_SCOPE, type Scope } from "@/domain/scope";
import { assetRow, captionText } from "@/test/fixtures";
import { countScope, countsMeta, flowMeta, kindsMeta } from "./meta";

const range = resolveRange("30d");
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

describe("flowMeta", () => {
  it("names a pinned asset by its symbol and the circuit id it is pinned to", () => {
    const meta = flowMeta(pinnedAsset, range, "tokens", [], [assetRow({ symbol: "USDC" })]);
    // The id, not just the symbol: one token can be registered under several,
    // and the caption has to say which registration the page is showing.
    expect(captionText(meta)).toContain("asset USDC #1000");
    expect(captionText(meta)).toContain("chain 1");
  });

  it("says the token is unknown rather than naming it by registry id", () => {
    // The registry may not have loaded yet, or may not cover the chain.
    expect(captionText(flowMeta(pinnedAsset, range, "tokens", [], []))).toContain(
      "asset unknown token",
    );
  });

  it("says all assets when none is pinned, and drops the chain when unscoped", () => {
    const meta = flowMeta(EMPTY_SCOPE, range, "none", [], null);
    expect(captionText(meta)).toContain("all assets");
    expect(captionText(meta)).not.toContain("chain");
  });

  it("flags the open bucket only when a series is plotted", () => {
    const open = "newest bucket still filling";
    expect(flowMeta(EMPTY_SCOPE, range, "usd", [], null).basis).toContain(open);
    expect(flowMeta(EMPTY_SCOPE, range, "none", [], null).basis).not.toContain(open);
  });
});

describe("kindsMeta", () => {
  it("says the newest bucket is partial, and that pending is left out", () => {
    const meta = kindsMeta(range, EMPTY_SCOPE);
    expect(meta.basis).toBe("newest bucket still filling");
    expect(meta.gaps).toEqual(["pending excluded"]);
  });
});
