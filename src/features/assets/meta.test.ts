import { describe, expect, it } from "vitest";
import { assetRow, captionText, yieldRow } from "@/test/fixtures";
import { registryMeta } from "./meta";

const group = (chainId: number, count: number) => ({
  chainId,
  assets: Array.from({ length: count }, (_, i) =>
    assetRow({ symbol: "AA", assetIdU64: i, chainId }),
  ),
});

describe("registryMeta", () => {
  it("counts the assets and chains on show", () => {
    const meta = registryMeta([group(1, 2), group(10, 1)], null);
    expect(meta.lead).toContain("3 assets");
    expect(meta.lead).toContain("2 chains");
  });

  it("says nothing about yield when nothing earns", () => {
    expect(captionText(registryMeta([group(1, 2)], []))).not.toContain("earning");
  });

  /**
   * The return column looks like a yield, and a reader takes a yield for an
   * annual rate. Nothing here can annualise: one current index per asset,
   * overwritten every poll, with no history to fit a period to.
   */
  it("says the returns are not annualised once something earns", () => {
    const meta = registryMeta([group(1, 2)], [yieldRow()]);
    expect(meta.lead).toContain("1 earning");
    expect(meta.basis).toContain("not annualised");
  });

  it("counts only the yield assets on the chains being shown", () => {
    // A chain filtered out of the table must not inflate the caption.
    const meta = registryMeta([group(1, 1)], [yieldRow(), yieldRow({ chainId: 99 })]);
    expect(meta.lead).toContain("1 earning");
  });

  it("counts the bindings still awaiting a first poll", () => {
    const meta = registryMeta([group(1, 1)], [yieldRow({ updatedAt: null })]);
    expect(meta.gaps).toContain("1 awaiting a first poll");
  });

  it("drops a gap list to empty rather than to a falsy entry", () => {
    // `gapList` filters, so a card with no gaps must not render " · " for one.
    expect(registryMeta([{ chainId: 1, assets: [] }], []).gaps).toEqual([]);
  });
});
