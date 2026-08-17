import { describe, expect, it } from "vitest";
import { createMockApi } from "./index";

// nowSec is pinned, not just the seed. createMockApi captures the wall clock
// for every generated timestamp (priceAt, bucket boundaries), so two instances
// built with the same seed a fraction of a second apart still disagree if they
// land either side of a second boundary — which the determinism tests below do
// roughly one run in ten. Pinning it is what actually makes the seed mean
// "reproducible".
const api = (over = {}) =>
  createMockApi({ latencyMs: 0, seed: 1234, nowSec: 1_700_000_000, ...over });

// createMockApi() eagerly builds the whole dataset in its constructor —
// buildAssets, then buildHourlyFlows over HOURS_OF_HISTORY (90 days of hourly
// buckets), then buildTreeAdvances — which costs ~110ms a time. Calling the
// factory per assertion made this file spend seconds re-generating identical
// data.
//
// The mock is immutable once built, so every test that does not specifically
// need a *fresh* instance shares this one. The two determinism tests below
// still construct their own, because comparing two independently-seeded
// instances is the whole point of them.
const shared = api();

describe("mock determinism", () => {
  it("reproduces the same dataset from the same seed", async () => {
    const [a, b] = await Promise.all([api().listAssets(), api().listAssets()]);
    expect(a).toEqual(b);
  });

  it("keeps the dataset independent of how many requests failed", async () => {
    // Failure injection draws from its own stream; sharing the data stream
    // would make the assets depend on the failure sequence.
    const chaotic = api({ failureRate: 0.5 });
    let succeeded = 0;
    let failed = 0;
    const expected = await api().listAssets();
    for (let i = 0; i < 40; i++) {
      const rows = await chaotic.listAssets().catch(() => null);
      if (rows === null) failed++;
      else {
        succeeded++;
        expect(rows).toEqual(expected);
      }
    }
    // Both branches have to have been exercised for the check above to mean
    // anything.
    expect(succeeded).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it("never fails when no failure rate is configured", async () => {
    // Asserting on health() alone would prove nothing: it awaits wait() and
    // returns, without going through respond() -> maybeFail(), so it resolves
    // even at failureRate: 1. listAssets() is what actually draws from the
    // chaos stream.
    //
    // Sharing one instance also matters. Constructing a fresh api() per
    // iteration reset the chaos RNG every time, so the old loop checked the
    // same first draw twenty times instead of twenty consecutive draws.
    for (let i = 0; i < 20; i++) {
      await expect(shared.listAssets()).resolves.toBeDefined();
      await expect(shared.health()).resolves.toBe(true);
    }
  });
});

describe("mock flow contract", () => {
  it("emits token amounts only when a single asset is in scope", async () => {
    const assets = await shared.listAssets();
    const one = assets[0];

    const pinned = await shared.getAssetFlows({
      chainId: one.chainId,
      assetIdU64: one.assetIdU64,
      bucketSec: 86400,
    });
    expect(pinned.length).toBeGreaterThan(0);
    expect(pinned.every((p) => p.in !== null && p.out !== null)).toBe(true);

    // Several assets have no addable token total, in any unit.
    const all = await shared.getAssetFlows({ bucketSec: 86400 });
    expect(all.every((p) => p.in === null && p.out === null)).toBe(true);
  });

  it("returns buckets in ascending time order", async () => {
    const rows = await shared.getAssetFlows({ bucketSec: 86400 });
    const sorted = [...rows].sort((a, b) => a.ts - b.ts);
    expect(rows.map((r) => r.ts)).toEqual(sorted.map((r) => r.ts));
  });

  it("counts an unpriced asset instead of dropping it from the total", async () => {
    const rows = await shared.getAssetFlows({ bucketSec: 86400 });
    // One profile is deliberately unpriced, to exercise the partial-coverage UI.
    expect(rows.some((p) => p.unpricedAssets > 0)).toBe(true);
    expect(rows.every((p) => p.inUsd !== null)).toBe(true);
  });
});

describe("mock transaction feed", () => {
  it("returns newest first, within the requested limit", async () => {
    const rows = await shared.getRecentTransactions({ limit: 15 });
    expect(rows).toHaveLength(15);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].blockTs).toBeGreaterThanOrEqual(rows[i].blockTs);
    }
  });

  it("speaks exactly the TxOut shape, with no extra wire fields", async () => {
    const [row] = await shared.getRecentTransactions({ limit: 1 });
    expect(Object.keys(row).sort()).toEqual([
      "amount",
      "assetIdU64",
      "blockNumber",
      "blockTs",
      "chainId",
      "kind",
      "txHashHex",
    ]);
  });

  it("names no asset and no amount for a transfer, which moves no public value", async () => {
    const rows = await shared.getRecentTransactions({ limit: 200 });
    const transfers = rows.filter((r) => r.kind === "transfer");
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((r) => r.assetIdU64 === null && r.amount === null)).toBe(true);
  });

  it("returns only the pinned kind", async () => {
    const rows = await shared.getRecentTransactions({ limit: 20, kind: "withdraw" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.kind === "withdraw")).toBe(true);
  });

  it("fills the page with the pinned kind rather than filtering it down", async () => {
    // The kind is applied before the limit, as it is in the SQL: a filtered
    // feed is a full page of one kind, not the survivors of a mixed one.
    const mixed = await shared.getRecentTransactions({ limit: 20 });
    const pinned = await shared.getRecentTransactions({ limit: 20, kind: "withdraw" });
    expect(pinned).toHaveLength(20);
    expect(pinned.length).toBeGreaterThan(mixed.filter((r) => r.kind === "withdraw").length);
  });

  it("bins kinds into the same buckets the feed reports", async () => {
    const kinds = await shared.getTxKinds({ bucketSec: 3600 });
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.every((k) => k.deposit + k.pending + k.transfer + k.withdraw > 0)).toBe(true);
  });
});

describe("mock chain flows", () => {
  it("returns 24 hourly slots per chain", async () => {
    const rows = await shared.getChainFlows24h();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.hourlyIn.length === 24 && r.hourlyOut.length === 24)).toBe(true);
  });

  it("carries transaction counts, and totals them", async () => {
    const [row] = await shared.getChainFlows24h();
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
    expect(row.txCount).toBe(sum(row.hourlyIn));
    expect(row.txCount).toBeGreaterThan(0);
  });

  it("reports no value, because a chain's assets have no addable token total", async () => {
    // The backend documents inflow/outflow/hourlyOut as reserved and always 0.
    // Summing each chain's token amounts here is the cross-asset total the flow
    // endpoint refuses to produce, and the grid rendered it as "vol".
    const rows = await shared.getChainFlows24h();
    expect(rows.every((r) => r.inflow === 0 && r.outflow === 0)).toBe(true);
    expect(rows.every((r) => r.hourlyOut.every((v) => v === 0))).toBe(true);
  });

  it("hottest chain first, by the only figure it reports", async () => {
    const rows = await shared.getChainFlows24h();
    const counts = rows.map((r) => r.txCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("spans 24 whole hours anchored on now, dropping what falls outside", async () => {
    // The hour containing `now` is slot 23. Anchoring on `now - 86400` instead
    // spans 25 distinct hours, and clamping the extra one into slot 23 reads as
    // real activity in an hour that had none.
    const nowSec = 1_700_000_000;
    const hourStart = Math.floor(nowSec / 3600) * 3600 - 23 * 3600;
    const [row] = await shared.getChainFlows24h();
    const counts = await shared.getTxCounts({
      chainId: row.chainId,
      bucketSec: 3600,
      sinceTs: hourStart,
    });
    expect(counts.length).toBeLessThanOrEqual(24);
    expect(row.txCount).toBe(counts.reduce((s, p) => s + p.count, 0));
  });
});
