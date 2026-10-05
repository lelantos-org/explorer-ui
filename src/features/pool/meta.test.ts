import { describe, expect, it } from "vitest";
import { captionText, LOADING_TEXT, poolNotesRow as notes } from "@/test/fixtures";
import { heldCaption, lockedMeta, poolNotesMeta } from "./meta";
import type { LockedSummary } from "./summary";

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
    expect(captionText(lockedMeta(lockedSummary()))).not.toContain("unpriced");
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

  /**
   * The split is the point of the tiers, so it needs its own guard. A gap folded
   * into `lead` renders at the figure's weight and stops being scannable. These
   * assert placement rather than presence — `captionText` would pass either way.
   */
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
});

describe("poolNotesMeta", () => {
  it("warns that the per-chain counts do not add", () => {
    // Each chain has its own tree, so notes on one are no cover on another. The
    // card's shape — a row of numbers — otherwise invites summing them.
    expect(poolNotesMeta([notes(), notes({ chainId: 10 })]).basis).toContain("not summable");
  });

  it("says the headline figure excludes relayer notes", () => {
    const meta = poolNotesMeta([notes()]);
    expect(captionText(meta)).toContain("relayer notes excluded");
    expect(meta.gaps).toContain("200 relayer notes excluded");
  });

  it("separates loading from an empty tree", () => {
    expect(poolNotesMeta(null).lead).toBe(LOADING_TEXT);
    expect(poolNotesMeta([]).lead).toBe("no notes committed");
  });
});

describe("heldCaption", () => {
  it("names dollars, and says when they are a partial total", () => {
    expect(heldCaption({ unit: "usd", value: 10, unpricedAssets: 0 })).toBe("USD at spot · now");
    expect(heldCaption({ unit: "usd", value: 10, unpricedAssets: 2 })).toBe(
      "USD at spot · partial · now",
    );
  });

  it("names tokens once one asset is pinned", () => {
    expect(heldCaption({ unit: "tokens", value: 3, unpricedAssets: 0 })).toBe("tokens · now");
  });
});
