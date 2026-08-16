import { describe, expect, it } from "vitest";
import { createMockApi } from "./index";

const api = (over = {}) => createMockApi({ latencyMs: 0, seed: 1234, ...over });

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
    for (let i = 0; i < 20; i++) await expect(api().health()).resolves.toBe(true);
  });
});

describe("mock flow contract", () => {
  it("emits token amounts only when a single asset is in scope", async () => {
    const assets = await api().listAssets();
    const one = assets[0];

    const pinned = await api().getAssetFlows({
      chainId: one.chainId,
      assetIdU64: one.assetIdU64,
      bucketSec: 86400,
    });
    expect(pinned.length).toBeGreaterThan(0);
    expect(pinned.every((p) => p.in !== null && p.out !== null)).toBe(true);

    // Several assets have no addable token total, in any unit.
    const all = await api().getAssetFlows({ bucketSec: 86400 });
    expect(all.every((p) => p.in === null && p.out === null)).toBe(true);
  });

  it("returns buckets in ascending time order", async () => {
    const rows = await api().getAssetFlows({ bucketSec: 86400 });
    const sorted = [...rows].sort((a, b) => a.ts - b.ts);
    expect(rows.map((r) => r.ts)).toEqual(sorted.map((r) => r.ts));
  });

  it("counts an unpriced asset instead of dropping it from the total", async () => {
    const rows = await api().getAssetFlows({ bucketSec: 86400 });
    // One profile is deliberately unpriced, to exercise the partial-coverage UI.
    expect(rows.some((p) => p.unpricedAssets > 0)).toBe(true);
    expect(rows.every((p) => p.inUsd !== null)).toBe(true);
  });
});

describe("mock transaction feed", () => {
  it("returns newest first, within the requested limit", async () => {
    const rows = await api().getRecentTransactions({ limit: 15 });
    expect(rows).toHaveLength(15);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].blockTs).toBeGreaterThanOrEqual(rows[i].blockTs);
    }
  });

  it("speaks exactly the TxOut shape, with no extra wire fields", async () => {
    const [row] = await api().getRecentTransactions({ limit: 1 });
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
    const rows = await api().getRecentTransactions({ limit: 200 });
    const transfers = rows.filter((r) => r.kind === "transfer");
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((r) => r.assetIdU64 === null && r.amount === null)).toBe(true);
  });

  it("bins kinds into the same buckets the feed reports", async () => {
    const kinds = await api().getTxKinds({ bucketSec: 3600 });
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.every((k) => k.deposit + k.pending + k.transfer + k.withdraw > 0)).toBe(true);
  });
});

describe("mock chain flows", () => {
  it("returns 24 hourly slots per chain", async () => {
    const rows = await api().getChainFlows24h();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.hourlyIn.length === 24 && r.hourlyOut.length === 24)).toBe(true);
  });

  it("totals each chain's hourly series", async () => {
    const [row] = await api().getChainFlows24h();
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
    expect(row.inflow).toBe(sum(row.hourlyIn));
    expect(row.outflow).toBe(sum(row.hourlyOut));
  });
});
