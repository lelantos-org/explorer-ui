import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AssetOut, YieldAsset } from "../../api";
import { assetKey } from "../../lib/assets";
import type { ScopeGroup } from "../../lib/scope";
import { yieldRow } from "../../test/fixtures";
import AssetRegistry, { type YieldIndex } from "./AssetRegistry";

const asset = (over: Partial<AssetOut> = {}): AssetOut => ({
  chainId: 8453,
  assetIdU64: 2,
  tokenHex: "833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  scale: "1",
  decimals: 6,
  symbol: "USDC",
  priceUsd: 1,
  priceAt: 1,
  depositBps: 0,
  withdrawBps: 20,
  ...over,
});

const group = (assets: AssetOut[], chainId = 8453): ScopeGroup => ({ chainId, assets });

const index = (rows: YieldAsset[]): YieldIndex =>
  new Map(rows.map((y) => [assetKey(y.chainId, y.assetIdU64), y]));

/** A binding for the asset `asset()` builds. Stated rather than left to two
 *  fixtures agreeing by luck: the column is a join, and the ids are the join. */
const bound = (over: Partial<YieldAsset> = {}): YieldAsset =>
  yieldRow({ chainId: 8453, assetIdU64: 2, ...over });

const render = (
  groups: ScopeGroup[],
  selected: number | null = null,
  yields: YieldIndex | null = null,
) =>
  renderToString(
    <AssetRegistry groups={groups} loading={false} yields={yields} selected={selected} />,
  ).replaceAll("<!-- -->", "");

describe("AssetRegistry", () => {
  it("shows both fee legs", () => {
    const html = render([group([asset()])]);
    expect(html).toContain("free");
    expect(html).toContain("0.2%");
    expect(html).toContain("fee in");
    expect(html).toContain("fee out");
  });

  /**
   * The registry answers "can I shield this, and what does it cost". The
   * registry id and ERC20 decimals answer neither — they are plumbing that
   * belongs to the rows using them, not to a reader choosing an asset.
   */
  it("carries only the columns a reader chooses an asset by", () => {
    const html = render([group([asset({ assetIdU64: 7, decimals: 6, scale: "1000000" })])]);
    for (const dropped of [">id<", ">decimals<", ">scale<"]) {
      expect(html).not.toContain(dropped);
    }
  });

  /** The address identifies the token, but a truncated hex is not worth a
   *  column — the symbol carries it as a link instead. */
  it("links the symbol out to the chain's explorer", () => {
    const html = render([group([asset()])]);
    expect(html).toContain("https://basescan.org/token/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  // A local node has no explorer, so the name stays plain rather than becoming
  // a link into nowhere.
  it("leaves the name unlinked on a chain with no explorer", () => {
    const html = render([group([asset({ chainId: 31337 })], 31337)]);
    expect(html).toContain("USDC");
    expect(html).not.toContain("<a ");
  });

  /**
   * Narrowing happens in `groupsInScope` before render, so the component shows
   * exactly what it is handed — one chain, and one asset inside it.
   */
  it("renders only the groups it is given", () => {
    const html = render([group([asset({ symbol: "USDC" })])]);
    expect(html).toContain("USDC");
    expect(html).not.toContain("Ethereum");
  });

  /**
   * The distinction the per-asset fee model rests on. With no global rate to
   * inherit, an unindexed leg is unknown; rendering it as "free" would claim a
   * cost the indexer never observed.
   */
  it("renders an unindexed fee differently from a zero one", () => {
    const zero = render([group([asset({ depositBps: 0, withdrawBps: 0 })])]);
    const unknown = render([group([asset({ depositBps: null, withdrawBps: null })])]);
    expect(zero).toContain("free");
    expect(unknown).not.toContain("free");
    expect(unknown).toContain("not indexed yet");
  });

  /** All three states carry a distinct class, so none can inherit another's
   *  styling by accident. */
  it("gives each fee state its own tone", () => {
    expect(render([group([asset({ depositBps: 0 })])])).toContain("fee--free");
    expect(render([group([asset({ depositBps: 20 })])])).toContain("fee--charged");
    expect(render([group([asset({ depositBps: null })])])).toContain("fee--unknown");
  });

  it("keeps 20 and 25 bps apart rather than rounding them together", () => {
    const html = render([group([asset({ depositBps: 20, withdrawBps: 25 })])]);
    expect(html).toContain("0.2%");
    expect(html).toContain("0.25%");
  });

  it("names an asset with no symbol by its short address, still linked", () => {
    const html = render([group([asset({ symbol: null })])]);
    expect(html).not.toContain("USDC");
    expect(html).toContain("8335");
    expect(html).toContain("basescan.org/token/");
  });

  // A chain can report activity while registering no assets, so this is a real
  // state and not a loading one.
  it("names a chain that owns no assets", () => {
    expect(render([group([], 1)])).toContain("no assets registered");
  });

  it("groups assets under every chain", () => {
    const html = render([
      group([asset()], 8453),
      group([asset({ chainId: 1, symbol: "WETH" })], 1),
    ]);
    expect(html).toContain("Base");
    expect(html).toContain("Ethereum");
  });

  it("marks the pinned chain", () => {
    expect(render([group([asset()])], 8453)).toContain("registry__chain--on");
    expect(render([group([asset()])], null)).not.toContain("registry__chain--on");
  });

  describe("the return column", () => {
    it("shows the return for an asset whose custody earns", () => {
      const html = render([group([asset()])], null, index([bound()]));
      expect(html).toContain("+3.42%");
      expect(html).toContain("return");
    });

    /**
     * A plain asset has no return. A dash would say its return is unknown,
     * which is what a dash means in every other column here — and would put
     * every non-earning asset in the same visual state as one whose venue has
     * never been polled.
     */
    it("leaves a plain-custody asset blank rather than dashed", () => {
      const html = render([group([asset()])], null, index([]));
      expect(html).toContain("plain custody");
      expect(html).not.toContain("+");
    });

    it("dashes an asset that is bound but not polled yet", () => {
      const html = render(
        [group([asset()])],
        null,
        index([bound({ indexRay: null, updatedAt: null })]),
      );
      expect(html).toContain("not polled yet");
      expect(html).not.toContain("plain custody");
    });

    /** A halt stops accrual and leaves the venue bound, so the figure stays and
     *  the badge explains why it has stopped moving. */
    it("badges a halted asset beside its return", () => {
      const html = render([group([asset()])], null, index([bound({ halted: true })]));
      expect(html).toContain("halted");
      expect(html).toContain("+3.42%");
    });

    /** The column looks like a yield, and a reader takes a yield for a rate. */
    it("never presents the return as an annual rate", () => {
      const html = render([group([asset()])], null, index([bound()])).toLowerCase();
      expect(html).not.toContain("apy");
      expect(html).not.toContain("apr");
      expect(html).toContain("not an annual rate");
    });

    it("renders the column even before the yield rows have loaded", () => {
      // `null` is loading, not "nothing earns": the table still has to draw.
      const html = render([group([asset()])], null, null);
      expect(html).toContain("return");
    });

    /**
     * The bindings arrive in their own request. Until it lands, this column
     * knows nothing about any asset — so it must not answer for one. Claiming
     * "does not earn" while the answer is still in flight is the same
     * unknown-as-zero mistake the blank/dash split exists to avoid.
     */
    it("claims nothing about an asset while the bindings are still loading", () => {
      const html = render([group([asset()])], null, null);
      expect(html).not.toContain("plain custody");
      expect(html).not.toContain("not polled yet");
    });
  });
});
