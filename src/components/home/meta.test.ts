import { describe, expect, it } from "vitest";
import type { AnonymitySet, AssetOut, PoolNotes } from "../../api";
import { resolveRange } from "../../lib/ranges";
import { EMPTY_SCOPE, type Scope } from "../../lib/scope";
import {
  anonymityMeta,
  chainsMeta,
  countScope,
  countsMeta,
  flowMeta,
  lockedMeta,
  poolNotesMeta,
} from "./meta";

const range = resolveRange("30d");

/** What every caption reads while its data is still in flight. */
const LOADING_TEXT = "loading…";

const asset = (symbol: string | null): AssetOut => ({
  chainId: 1,
  assetIdU64: 1000,
  tokenHex: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  scale: "1000000",
  decimals: 6,
  symbol,
  priceUsd: null,
  priceAt: null,
  depositBps: null,
  withdrawBps: null,
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

const cohort = (count: number, publicOut = "500", recentCount = count): AnonymitySet => ({
  chainId: 1,
  assetIdU64: 1000,
  publicOut,
  count,
  recentCount,
  firstTs: 1,
  lastTs: 2,
});

describe("anonymityMeta", () => {
  /**
   * The load-bearing claim on this card. An anonymity set is every withdrawal
   * of that denomination the pool has ever seen, so the card ignores the range
   * the rest of the page is filtered to. Unsaid, a reader takes the counts for
   * the selected window and reads every k as far smaller than it is.
   */
  it("says the counts cover all history, not the selected range", () => {
    expect(anonymityMeta([cohort(40)])).toContain("all history");
  });

  /**
   * Part C's only regression guard. The upper-bound claim is stated in prose in
   * exactly one place at card level, and prose with no test rots silently.
   */
  it("says the counts are an upper bound, not a headcount", () => {
    expect(anonymityMeta([cohort(40)])).toContain("at most");
  });

  it("counts dormant cohorts, naming the window", () => {
    const meta = anonymityMeta([cohort(40, "500", 0), cohort(40, "200", 4)]);
    expect(meta).toContain("1 dormant in 30d");
  });

  it("says nothing about dormancy when every cohort is active", () => {
    expect(anonymityMeta([cohort(40)])).not.toContain("dormant");
  });

  it("counts how many sets are below the threshold", () => {
    const meta = anonymityMeta([cohort(1, "10"), cohort(4, "20"), cohort(90, "50")]);
    expect(meta).toContain("3 denominations");
    expect(meta).toContain("2 below k=10");
  });

  it("says nothing about thin sets when none are", () => {
    expect(anonymityMeta([cohort(90)])).not.toContain("below");
  });

  it("separates loading from having no denominations", () => {
    expect(anonymityMeta(null)).toBe(LOADING_TEXT);
    expect(anonymityMeta([])).toBe("no denominations recorded");
  });
});

const notes = (over: Partial<PoolNotes> = {}): PoolNotes => ({
  chainId: 1,
  leaves: 1_000,
  feeNotes: 200,
  lastTs: 1,
  ...over,
});

describe("poolNotesMeta", () => {
  it("warns that the per-chain counts do not add", () => {
    // Each chain has its own tree, so notes on one are no cover on another. The
    // card's shape — a row of numbers — otherwise invites summing them.
    expect(poolNotesMeta([notes(), notes({ chainId: 10 })])).toContain("not summable");
  });

  it("says the headline figure excludes relayer notes", () => {
    const meta = poolNotesMeta([notes()]);
    expect(meta).toContain("relayer notes excluded");
    expect(meta).toContain("200 relayer notes");
  });

  it("separates loading from an empty tree", () => {
    expect(poolNotesMeta(null)).toBe(LOADING_TEXT);
    expect(poolNotesMeta([])).toBe("no notes committed");
  });
});
