import { describe, expect, it } from "vitest";
import type { AnonymitySet, AssetOut, PoolNotes } from "../../api";
import type { LockedSummary } from "../../lib/aggregate";
import { resolveRange } from "../../lib/ranges";
import { EMPTY_SCOPE, type Scope } from "../../lib/scope";
import { yieldRow } from "../../test/fixtures";
import {
  anonymityMeta,
  type CardMeta,
  chainsMeta,
  countScope,
  countsMeta,
  flowMeta,
  lockedMeta,
  poolNotesMeta,
  registryMeta,
} from "./meta";

const range = resolveRange("30d");

/** What every caption reads while its data is still in flight. */
const LOADING_TEXT = "loading…";

/** The whole caption as one string, for the assertions that only ask whether a
 *  phrase is present at all. Tier-specific claims read the field directly. */
const text = (m: CardMeta): string =>
  [m.lead, m.basis, ...(m.gaps ?? [])].filter(Boolean).join(" · ");

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
    expect(chainsMeta(null).lead).toBe("loading…");
  });

  it("omits the reserved value fields rather than printing 0 as a measurement", () => {
    const meta = chainsMeta({ chains: 3, inflow: 0, outflow: 0, tx: 1200, hasValues: false });
    expect(meta.lead).toBe("3 chains · 1.2k tx");
  });

  it("includes them once the backend reports any", () => {
    const meta = chainsMeta({ chains: 2, inflow: 5, outflow: 3, tx: 10, hasValues: true });
    expect(meta.lead).toBe("2 chains · in 5 · out 3 · 10 tx");
  });
});

describe("flowMeta", () => {
  it("names a pinned asset by its symbol and the circuit id it is pinned to", () => {
    const meta = flowMeta(pinnedAsset, range, "tokens", [], [asset("USDC")]);
    // The id, not just the symbol: one token can be registered under several,
    // and the caption has to say which registration the page is showing.
    expect(text(meta)).toContain("asset USDC #1000");
    expect(text(meta)).toContain("chain 1");
  });

  it("says the token is unknown rather than naming it by registry id", () => {
    // The registry may not have loaded yet, or may not cover the chain.
    expect(text(flowMeta(pinnedAsset, range, "tokens", [], []))).toContain("asset unknown token");
  });

  it("says all assets when none is pinned, and drops the chain when unscoped", () => {
    const meta = flowMeta(EMPTY_SCOPE, range, "none", [], null);
    expect(text(meta)).toContain("all assets");
    expect(text(meta)).not.toContain("chain");
  });
});

/** A locked summary. `venueHeldAssets` defaults to none, which is the shape of
 *  a pool holding only plain custody. */
const lockedSummary = (over: Partial<LockedSummary> = {}): LockedSummary => ({
  chains: 1,
  totalUsd: 10,
  unpricedAssets: 0,
  venueHeldAssets: 0,
  ...over,
});

describe("lockedMeta", () => {
  it("distinguishes an empty pool from one nothing could be priced in", () => {
    expect(lockedMeta(lockedSummary({ chains: 0, totalUsd: null })).lead).toBe("nothing escrowed");
    expect(lockedMeta(lockedSummary({ chains: 2, totalUsd: null, unpricedAssets: 4 })).lead).toBe(
      "2 chains · no usable prices",
    );
  });

  it("carries the count of assets its total leaves out", () => {
    const meta = lockedMeta(lockedSummary({ chains: 2, totalUsd: 1500, unpricedAssets: 1 }));
    expect(meta.lead).toBe("$1.5k across 2 chains");
    expect(meta.gaps).toContain("1 unpriced asset excluded");
  });

  it("says nothing about exclusions when the total covers everything", () => {
    expect(text(lockedMeta(lockedSummary()))).not.toContain("unpriced");
  });

  it("claims deposits minus withdrawals only while that is what it measured", () => {
    expect(lockedMeta(lockedSummary()).basis).toContain("deposits − withdrawals ·");
  });

  /**
   * A yield asset's balance is read from its venue, so the flow difference
   * misses everything it has earned. Leaving the caption at "deposits −
   * withdrawals" with one in the total states something false about the number
   * beside it.
   */
  it("stops claiming a flow difference once a venue-held asset is in the total", () => {
    const meta = lockedMeta(lockedSummary({ venueHeldAssets: 2 }));
    expect(meta.basis).toContain("except 2 venue-held assets");
    expect(meta.basis).not.toContain("deposits − withdrawals ·");
  });
});

/**
 * The split is the point of the type, so it needs its own guard.
 *
 * A gap folded into `lead` renders in the same weight as the figure and stops
 * being scannable, which is exactly the state the tiering replaced. These assert
 * placement rather than presence — `text()` would pass either way.
 */
describe("caption tiers", () => {
  it("keeps exclusions out of the figure", () => {
    const m = lockedMeta(lockedSummary({ chains: 2, totalUsd: 1500, unpricedAssets: 1 }));
    expect(m.lead).not.toContain("unpriced");
    expect(m.gaps).toEqual(["1 unpriced asset excluded"]);
  });

  it("keeps the definition out of the figure", () => {
    const m = lockedMeta(lockedSummary({ venueHeldAssets: 1 }));
    expect(m.lead).not.toContain("deposits");
    expect(m.basis).toContain("deposits − withdrawals");
  });

  it("omits an empty tier rather than carrying a blank one", () => {
    // A card with nothing to caveat and nothing missing is just its figure.
    const m = chainsMeta({ chains: 2, hasValues: false, inflow: 0, outflow: 0, tx: 10 });
    expect(m.basis).toBeUndefined();
    expect(m.gaps ?? []).toEqual([]);
  });

  it("drops a gap list to empty rather than to a falsy entry", () => {
    // `gapList` filters, so a card with no gaps must not render " · " for one.
    const m = registryMeta([{ chainId: 1, assets: [] }], []);
    expect(m.gaps).toEqual([]);
  });
});

describe("registryMeta", () => {
  const grp = (chainId: number, count: number) => ({
    chainId,
    assets: Array.from({ length: count }, (_, i) => ({ ...asset("AA"), assetIdU64: i, chainId })),
  });

  it("counts the assets and chains on show", () => {
    const meta = registryMeta([grp(1, 2), grp(10, 1)], null);
    expect(meta.lead).toContain("3 assets");
    expect(meta.lead).toContain("2 chains");
  });

  it("says nothing about yield when nothing earns", () => {
    expect(text(registryMeta([grp(1, 2)], []))).not.toContain("earning");
  });

  /**
   * The return column looks like a yield, and a reader takes a yield for an
   * annual rate. Nothing here can annualise: one current index per asset,
   * overwritten every poll, with no history to fit a period to.
   */
  it("says the returns are not annualised once something earns", () => {
    const meta = registryMeta([grp(1, 2)], [yieldRow()]);
    expect(meta.lead).toContain("1 earning");
    expect(meta.basis).toContain("not annualised");
  });

  it("counts only the yield assets on the chains being shown", () => {
    // A chain filtered out of the table must not inflate the caption.
    const meta = registryMeta([grp(1, 1)], [yieldRow(), yieldRow({ chainId: 99 })]);
    expect(meta.lead).toContain("1 earning");
  });

  it("counts the bindings still awaiting a first poll", () => {
    const meta = registryMeta([grp(1, 1)], [yieldRow({ updatedAt: null })]);
    expect(meta.gaps).toContain("1 awaiting a first poll");
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
    expect(anonymityMeta([cohort(40)]).basis).toContain("all history");
  });

  /**
   * Part C's only regression guard. The upper-bound claim is stated in prose in
   * exactly one place at card level, and prose with no test rots silently.
   */
  it("says the counts are an upper bound, not a headcount", () => {
    expect(anonymityMeta([cohort(40)]).basis).toContain("at most");
  });

  it("counts dormant cohorts, naming the window", () => {
    const meta = anonymityMeta([cohort(40, "500", 0), cohort(40, "200", 4)]);
    expect(meta.gaps).toContain("1 dormant in 30d");
  });

  it("says nothing about dormancy when every cohort is active", () => {
    expect(text(anonymityMeta([cohort(40)]))).not.toContain("dormant");
  });

  it("counts how many sets are below the threshold", () => {
    const meta = anonymityMeta([cohort(1, "10"), cohort(4, "20"), cohort(90, "50")]);
    expect(meta.lead).toContain("3 denominations");
    expect(meta.gaps).toContain("2 below k=10");
  });

  it("says nothing about thin sets when none are", () => {
    expect(text(anonymityMeta([cohort(90)]))).not.toContain("below");
  });

  it("separates loading from having no denominations", () => {
    expect(anonymityMeta(null).lead).toBe(LOADING_TEXT);
    expect(anonymityMeta([]).lead).toBe("no denominations recorded");
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
    expect(poolNotesMeta([notes(), notes({ chainId: 10 })]).basis).toContain("not summable");
  });

  it("says the headline figure excludes relayer notes", () => {
    const meta = poolNotesMeta([notes()]);
    expect(text(meta)).toContain("relayer notes excluded");
    expect(meta.gaps).toContain("200 relayer notes excluded");
  });

  it("separates loading from an empty tree", () => {
    expect(poolNotesMeta(null).lead).toBe(LOADING_TEXT);
    expect(poolNotesMeta([]).lead).toBe("no notes committed");
  });
});
