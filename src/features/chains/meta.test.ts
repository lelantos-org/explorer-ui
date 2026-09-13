import { describe, expect, it } from "vitest";
import { LOADING_TEXT } from "@/test/fixtures";
import { chainsMeta } from "./meta";

describe("chainsMeta", () => {
  it("waits rather than reporting a total it does not have", () => {
    expect(chainsMeta(null).lead).toBe(LOADING_TEXT);
  });

  it("omits the reserved value fields rather than printing 0 as a measurement", () => {
    const meta = chainsMeta({ chains: 3, inflow: 0, outflow: 0, tx: 1200, hasValues: false });
    expect(meta.lead).toBe("3 chains · 1.2k tx");
  });

  it("includes them once the backend reports any", () => {
    const meta = chainsMeta({ chains: 2, inflow: 5, outflow: 3, tx: 10, hasValues: true });
    expect(meta.lead).toBe("2 chains · in 5 · out 3 · 10 tx");
  });

  it("omits an empty tier rather than carrying a blank one", () => {
    // A card with nothing to caveat and nothing missing is just its figure.
    const m = chainsMeta({ chains: 2, hasValues: false, inflow: 0, outflow: 0, tx: 10 });
    expect(m.basis).toBeUndefined();
    expect(m.gaps ?? []).toEqual([]);
  });
});
