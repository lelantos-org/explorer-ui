import { describe, expect, it } from "vitest";
import { ALL_KINDS } from "@/lib/kinds";
import { DEFAULT_RANGE } from "@/lib/ranges";
import { EMPTY_SCOPE } from "@/lib/scope";
import { readFilters, writeScope } from "./filterParams";

const read = (qs: string) => readFilters(new URLSearchParams(qs));

describe("readFilters", () => {
  it("reads an empty query as the unfiltered default view", () => {
    expect(read("")).toEqual({ scope: EMPTY_SCOPE, range: DEFAULT_RANGE, txKind: ALL_KINDS });
  });

  it("reads a chain, an asset on it, a range and a kind", () => {
    const f = read("?chain=8453&asset=4&range=7d&kind=withdraw");
    expect(f.scope).toEqual({ chainId: 8453, assetIdU64: 4 });
    expect(f.range.label).toBe("7d");
    expect(f.txKind).toBe("withdraw");
  });

  it("drops an asset that arrives without its chain", () => {
    expect(read("?asset=4").scope).toEqual(EMPTY_SCOPE);
  });

  it("falls back on every unrecognised value rather than failing", () => {
    const f = read("?chain=abc&range=1y&kind=bridge");
    expect(f.scope).toEqual(EMPTY_SCOPE);
    expect(f.range).toBe(DEFAULT_RANGE);
    expect(f.txKind).toBe(ALL_KINDS);
  });
});

describe("writeScope", () => {
  it("writes a chain and an asset", () => {
    const p = new URLSearchParams("range=7d");
    writeScope(p, { chainId: 1, assetIdU64: 9 });
    expect(p.toString()).toBe("range=7d&chain=1&asset=9");
  });

  it("clears the asset with the chain instead of leaving it dangling", () => {
    const p = new URLSearchParams("chain=1&asset=9&range=7d");
    writeScope(p, EMPTY_SCOPE);
    expect(p.toString()).toBe("range=7d");
  });

  it("drops the asset param when a whole chain is selected", () => {
    const p = new URLSearchParams("chain=1&asset=9");
    writeScope(p, { chainId: 1, assetIdU64: null });
    expect(p.toString()).toBe("chain=1");
  });
});
