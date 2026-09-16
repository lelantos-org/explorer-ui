import { describe, expect, it } from "vitest";
import { flowPoint as flow } from "@/test/fixtures";
import { sumCounts, sumFlows } from "./totals";

describe("sumFlows", () => {
  it("sums token amounts when a single asset is in scope", () => {
    const flows = [flow({ ts: 0, in: 10, out: 4 }), flow({ ts: 3600, in: 5, out: 6 })];
    expect(sumFlows(flows, "tokens")).toEqual({ inflow: 15, outflow: 10, net: 5 });
  });

  it("sums dollars in usd mode, ignoring the token fields", () => {
    const flows = [flow({ ts: 0, in: 1, out: 1, inUsd: 200, outUsd: 50 })];
    expect(sumFlows(flows, "usd")).toEqual({ inflow: 200, outflow: 50, net: 150 });
  });

  it("refuses to total unlike assets rather than adding them", () => {
    // The regression this guards: three assets with no prices once summed to
    // "3.10B" for what was 31 tokens.
    const flows = [flow({ ts: 0 }), flow({ ts: 3600 })];
    expect(sumFlows(flows, "none")).toBeNull();
  });

  it("is null while the request is still in flight", () => {
    expect(sumFlows(null, "tokens")).toBeNull();
  });
});

describe("count reducers", () => {
  const counts = [
    { ts: 0, count: 3 },
    { ts: 3600, count: 9 },
    { ts: 7200, count: 1 },
  ];

  it("totals over the range", () => {
    expect(sumCounts(counts)).toBe(13);
  });

  it("separates 'no data yet' from 'no activity'", () => {
    expect(sumCounts(null)).toBeNull();
    expect(sumCounts([])).toBe(0);
  });
});
