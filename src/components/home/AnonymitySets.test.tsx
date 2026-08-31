import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnonymitySet, AssetOut } from "../../api";
import { THIN_SET } from "../../lib/anonymity";
import AnonymitySets from "./AnonymitySets";

const set = (over: Partial<AnonymitySet> = {}): AnonymitySet => ({
  chainId: 1,
  assetIdU64: 1000,
  publicOut: "500",
  count: 42,
  // Fully recent by default, so a test that cares about dormancy has to say so.
  recentCount: over.count ?? 42,
  firstTs: 1,
  lastTs: 2,
  ...over,
});

const asset: AssetOut = {
  chainId: 1,
  assetIdU64: 1000,
  tokenHex: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  scale: "1000000",
  decimals: 6,
  symbol: "USDC",
  priceUsd: 1,
  priceAt: 1,
  depositBps: 0,
  withdrawBps: 20,
};

const render = (data: AnonymitySet[] | null, loading = false) =>
  renderToString(<AnonymitySets data={data} assets={[asset]} loading={loading} />).replaceAll(
    "<!-- -->",
    "",
  );

describe("AnonymitySets", () => {
  it("gives each cohort size its own tone", () => {
    // The three readings must not be able to inherit each other's styling: a
    // set of one is a finding, a thin set is a caution, a busy one is neither.
    expect(render([set({ count: 1 })])).toContain("aset--unique");
    expect(render([set({ count: THIN_SET - 1 })])).toContain("aset--thin");
    expect(render([set({ count: THIN_SET })])).toContain("aset--counted");
  });

  it("names a cohort of one rather than printing k = 1", () => {
    // "k = 1" alone reads as a small number on a scale. It is not on the scale:
    // it means the withdrawal has no cover at all.
    expect(render([set({ count: 1 })])).toContain("unique");
  });

  it("leads with the thinnest set", () => {
    const html = render([set({ count: 90, publicOut: "10" }), set({ count: 2, publicOut: "20" })]);
    // The thin one is the row worth acting on, so it must not need scrolling to.
    expect(html.indexOf("k = 2")).toBeLessThan(html.indexOf("k = 90"));
  });

  it("keeps the raw denomination available even when the label is abbreviated", () => {
    // `fmtCompact` renders 50000 as "50k"; the exact integer is the cohort's
    // identity, so it stays in the title.
    expect(render([set({ publicOut: "50000" })])).toContain("publicOut 50000");
  });

  it("names the asset a denomination belongs to", () => {
    // Two assets can publish the same integer and give each other no cover, so
    // a bare denomination would not identify the set.
    expect(render([set()])).toContain("USDC");
  });

  it("falls back to the asset id when the registry has not resolved a symbol", () => {
    expect(render([set({ assetIdU64: 7777 })])).toContain("asset 7777");
  });

  it("shows the thinnest sets and says how many it left off", () => {
    // A pool used off-ladder makes a denomination per withdrawal, so the full
    // list is a scroll rather than a finding. What must survive the cut is the
    // rows worth acting on.
    const many = Array.from({ length: 20 }, (_, i) => set({ count: i + 1, publicOut: `${i}` }));
    const html = render(many);
    expect(html).toContain("k = 1 · unique");
    expect(html).toContain("8 denominations with more cover not shown");
    // The busiest set is the one dropped, never the thinnest.
    expect(html).not.toContain("k = 20");
  });

  it("scales the bars against the widest one it actually drew", () => {
    // Against a maximum left off the card, every visible bar would flatten to
    // the floor and the comparison the card exists for would be unreadable.
    const rows = Array.from({ length: 14 }, (_, i) => set({ count: i + 1, publicOut: `${i}` }));
    const html = render(rows);
    // 12 visible, thinnest-first: k=12 is the widest drawn, so it fills 100%.
    expect(html).toContain("width:100%");
  });

  it("marks a dormant cohort and names the window", () => {
    const html = render([set({ count: 40, recentCount: 0 })]);
    expect(html).toContain("dormant");
    expect(html).toContain("30d");
  });

  it("reports the recent count when a cohort is still active", () => {
    expect(render([set({ count: 40, recentCount: 3 })])).toContain("3 in the last 30d");
  });

  /**
   * Dormancy is a second fact, not a downgrade. A cohort of 40 that has gone
   * quiet still has 40 withdrawals behind it, and an anonymity set is
   * all-history by definition — demoting its tone would understate real cover.
   */
  it("leaves a dormant cohort the tone its size earns", () => {
    const html = render([set({ count: 40, recentCount: 0 })]);
    expect(html).toContain("aset--counted");
    expect(html).not.toContain("aset--thin");
  });

  /**
   * A backend that predates the recency window sends no `recentCount` at all.
   * The field then arrives as null, and rendering it unguarded took the whole
   * page down with "Cannot read properties of undefined". A version skew during
   * a rolling deploy must degrade to saying less, never to a blank page.
   */
  it("renders a cohort whose recency the backend never reported", () => {
    const html = render([set({ count: 40, recentCount: null })]);
    expect(html).toContain("k = 40");
    // Silent about the window rather than claiming the cohort went quiet.
    expect(html).not.toContain("dormant");
    expect(html).not.toContain("in the last");
  });

  it("separates loading from genuinely having no denominations", () => {
    expect(render(null, true)).toContain("loading…");
    expect(render([])).toContain("no withdrawals with a recorded denomination");
  });
});
