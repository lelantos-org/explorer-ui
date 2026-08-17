import { describe, expect, it } from "vitest";
import type { FlowPoint } from "../api";
import { amounts, denomLabel, hasAmounts, pickDenom, unitShort } from "./denom";

const flow = (p: Partial<FlowPoint> & { ts: number }): FlowPoint => ({
  in: null,
  out: null,
  inUsd: null,
  outUsd: null,
  unpricedAssets: 0,
  ...p,
});

describe("pickDenom", () => {
  it("prefers token amounts, which the backend only sends for one asset", () => {
    expect(pickDenom([flow({ ts: 0, in: 1, out: 2, inUsd: 9, outUsd: 9 })])).toBe("tokens");
  });

  it("falls back to usd when every bucket is priced", () => {
    expect(pickDenom([flow({ ts: 0, inUsd: 5, outUsd: 5 })])).toBe("usd");
  });

  it("flags a partial total when some asset had no price", () => {
    expect(pickDenom([flow({ ts: 0, inUsd: 5, outUsd: 5, unpricedAssets: 2 })])).toBe(
      "usd-partial",
    );
  });

  it("refuses a unit when even one bucket is unpriced", () => {
    // Plotting the unpriced bucket as $0 would read as "no activity".
    const flows = [flow({ ts: 0, inUsd: 5, outUsd: 5 }), flow({ ts: 3600 })];
    expect(pickDenom(flows)).toBe("none");
  });

  it("treats a missing field from an older backend as unknown, not zero", () => {
    const legacy = [{ ts: 0, unpricedAssets: 0 } as unknown as FlowPoint];
    expect(pickDenom(legacy)).toBe("none");
  });

  it("has no denomination for an absent or empty range", () => {
    expect(pickDenom(null)).toBe("none");
    expect(pickDenom([])).toBe("none");
  });
});

describe("denom helpers", () => {
  it("gates rendering on there being a real unit", () => {
    expect(hasAmounts("tokens")).toBe(true);
    expect(hasAmounts("usd-partial")).toBe(true);
    expect(hasAmounts("none")).toBe(false);
  });

  it("projects the series the denomination names", () => {
    const p = flow({ ts: 0, in: 1, out: 2, inUsd: 30, outUsd: 40 });
    expect(amounts(p, "tokens")).toEqual({ in: 1, out: 2 });
    expect(amounts(p, "usd")).toEqual({ in: 30, out: 40 });
  });

  it("names how many assets a partial dollar total leaves out", () => {
    const flows = [flow({ ts: 0, unpricedAssets: 1 }), flow({ ts: 3600, unpricedAssets: 3 })];
    expect(denomLabel("usd-partial", flows)).toBe("USD · at spot · 3 unpriced assets excluded");
    expect(denomLabel("usd-partial", [flow({ ts: 0, unpricedAssets: 1 })])).toBe(
      "USD · at spot · 1 unpriced asset excluded",
    );
  });

  it("says dollars are spot-priced, since old volume is valued at today's price", () => {
    expect(denomLabel("usd", null)).toBe("USD · at spot");
    expect(unitShort("usd")).toBe("USD · at spot");
  });

  it("never prints a partial dollar figure as plain USD", () => {
    // A tile is often all a reader looks at, and a net that drops an unpriced
    // asset can be wrong in either direction.
    expect(unitShort("usd-partial")).toBe("USD · at spot · partial");
  });

  it("says so when there is no unit at all", () => {
    expect(unitShort("none")).toBe("—");
    expect(denomLabel("none", null)).toBe("no common unit — pick one asset");
  });
});
