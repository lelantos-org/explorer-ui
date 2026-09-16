import { describe, expect, it } from "vitest";
import { at } from "@/test/at";
import { chainFlowRow as chain } from "@/test/fixtures";
import { chainShares, summarizeChains } from "./summary";

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
    expect(shareOf(at(data, 0))).toBe(75);
    expect(shareOf(at(data, 1))).toBe(25);
  });

  it("shares by volume once values arrive", () => {
    const data = [
      chain({ chainId: 1, inflow: 6, outflow: 2, txCount: 1 }),
      chain({ chainId: 10, inflow: 2, txCount: 999 }),
    ];
    const { hasValues, shareOf } = chainShares(data);
    expect(hasValues).toBe(true);
    expect(shareOf(at(data, 0))).toBe(80);
  });

  it("does not divide by zero on an all-zero grid", () => {
    const data = [chain({ chainId: 1 })];
    expect(chainShares(data).shareOf(at(data, 0))).toBe(0);
  });
});
