import { describe, expect, it } from "vitest";
import type { ChainFlow, ChainLocked, CountPoint, FlowPoint } from "../api";
import {
  chainShares,
  peakCount,
  sumCounts,
  sumFlows,
  summarizeChains,
  summarizeLocked,
} from "./aggregate";

const flow = (p: Partial<FlowPoint> & { ts: number }): FlowPoint => ({
  in: null,
  out: null,
  inUsd: null,
  outUsd: null,
  unpricedAssets: 0,
  ...p,
});

const chain = (p: Partial<ChainFlow> & { chainId: number }): ChainFlow => ({
  inflow: 0,
  outflow: 0,
  hourlyIn: [],
  hourlyOut: [],
  txCount: 0,
  ...p,
});

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
  const counts: CountPoint[] = [
    { ts: 0, count: 3 },
    { ts: 3600, count: 9 },
    { ts: 7200, count: 1 },
  ];

  it("totals and peaks over the range", () => {
    expect(sumCounts(counts)).toBe(13);
    expect(peakCount(counts)).toBe(9);
  });

  it("separates 'no data yet' from 'no activity'", () => {
    expect(sumCounts(null)).toBeNull();
    expect(peakCount(null)).toBeNull();
    expect(sumCounts([])).toBe(0);
    // An empty range has no bucket to call the peak.
    expect(peakCount([])).toBeNull();
  });
});

describe("summarizeChains", () => {
  it("reports hasValues false while in/out are reserved zeros", () => {
    const s = summarizeChains([
      chain({ chainId: 1, txCount: 7 }),
      chain({ chainId: 10, txCount: 3 }),
    ]);
    expect(s).toEqual({ chains: 2, inflow: 0, outflow: 0, tx: 10, hasValues: false });
  });

  it("reports hasValues once the backend sends any value", () => {
    const s = summarizeChains([chain({ chainId: 1, inflow: 5, txCount: 1 })]);
    expect(s?.hasValues).toBe(true);
  });
});

describe("chainShares", () => {
  it("shares by tx count while there is no value to share by", () => {
    const data = [chain({ chainId: 1, txCount: 30 }), chain({ chainId: 10, txCount: 10 })];
    const { hasValues, shareOf } = chainShares(data);
    expect(hasValues).toBe(false);
    expect(shareOf(data[0])).toBe(75);
    expect(shareOf(data[1])).toBe(25);
  });

  it("shares by volume once values arrive", () => {
    const data = [
      chain({ chainId: 1, inflow: 6, outflow: 2, txCount: 1 }),
      chain({ chainId: 10, inflow: 2, txCount: 999 }),
    ];
    const { hasValues, shareOf } = chainShares(data);
    expect(hasValues).toBe(true);
    expect(shareOf(data[0])).toBe(80);
  });

  it("does not divide by zero on an all-zero grid", () => {
    const data = [chain({ chainId: 1 })];
    expect(chainShares(data).shareOf(data[0])).toBe(0);
  });
});

const locked = (chainId: number, lockedUsd: number | null, unpricedAssets = 0): ChainLocked => ({
  chainId,
  lockedUsd,
  unpricedAssets,
  assets: [],
});

describe("summarizeLocked", () => {
  it("totals the chains' dollars and carries what they exclude", () => {
    const summary = summarizeLocked([locked(1, 1000), locked(10, 250, 2)]);
    expect(summary).toEqual({ chains: 2, totalUsd: 1250, unpricedAssets: 2 });
  });

  it("skips a chain with no priced asset instead of counting it as zero", () => {
    const summary = summarizeLocked([locked(1, 1000), locked(10, null, 3)]);
    expect(summary?.totalUsd).toBe(1000);
    expect(summary?.chains).toBe(2);
    expect(summary?.unpricedAssets).toBe(3);
  });

  it("has no total at all when nothing anywhere could be priced", () => {
    // Not 0: an unpriceable pool is unknown, not empty.
    expect(summarizeLocked([locked(1, null, 1)])?.totalUsd).toBeNull();
  });

  it("stays null while unloaded, and reports an empty network as empty", () => {
    expect(summarizeLocked(null)).toBeNull();
    expect(summarizeLocked([])).toEqual({ chains: 0, totalUsd: null, unpricedAssets: 0 });
  });
});
