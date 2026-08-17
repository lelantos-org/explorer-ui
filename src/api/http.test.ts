import { describe, expect, it } from "vitest";
import { createHttpApi } from "./http";

/** A fetch that answers every request with one JSON body. */
const serving = (body: unknown): typeof fetch =>
  (async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  })) as unknown as typeof fetch;

const flowRow = (over: Record<string, unknown> = {}) => ({
  ts: 3600,
  in: "14",
  out: "1.5",
  inUsd: 26_400,
  outUsd: 2_800,
  unpricedAssets: 0,
  ...over,
});

describe("getAssetFlows wire mapping", () => {
  it("parses whole-token decimal strings into numbers", async () => {
    const api = createHttpApi({ fetchFn: serving([flowRow()]) });
    const [p] = await api.getAssetFlows({});
    expect(p.in).toBe(14);
    expect(p.out).toBe(1.5);
    expect(p.inUsd).toBe(26_400);
  });

  it("keeps an absent token total null, since several assets have no sum", async () => {
    const api = createHttpApi({ fetchFn: serving([flowRow({ in: null, out: null })]) });
    const [p] = await api.getAssetFlows({});
    expect(p.in).toBeNull();
    expect(p.out).toBeNull();
  });

  it("reads an omitted amount as null rather than NaN", async () => {
    // A backend that drops the field entirely used to parse to NaN, which passes
    // every `!= null` check downstream: the range picked `tokens`, summed to NaN
    // and printed "NaN" instead of falling back to dollars.
    const { in: _in, out: _out, ...withoutAmounts } = flowRow();
    const api = createHttpApi({ fetchFn: serving([withoutAmounts]) });
    const [p] = await api.getAssetFlows({});
    expect(p.in).toBeNull();
    expect(p.out).toBeNull();
  });
});
