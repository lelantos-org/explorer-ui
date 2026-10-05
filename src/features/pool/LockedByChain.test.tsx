import { describe, expect, it } from "vitest";
import type { ChainLocked, LockedAsset } from "@/api";
import { renderHtml } from "@/test/render";
import Card from "@/ui/Card";
import LockedByChain from "./LockedByChain";
import { summarizeLocked } from "./summary";

describe("LockedByChain inside its card", () => {
  /// The bug this whole prop exists for. `LockedByChain` reports a null `data`
  /// as "nothing escrowed yet" — a statement about the pool. With the backend
  /// unreachable `data` is also null, so the explorer asserted the pool was
  /// empty when it simply could not ask. `useAsync` returns an `error`
  /// precisely so those two are distinguishable; the page was dropping it.
  it("does not let a failed request read as an empty pool", () => {
    const failed = renderHtml(
      <Card title="escrowed by chain" error="fetch failed">
        <LockedByChain
          data={null}
          totalUsd={null}
          loading={false}
          selected={null}
          onSelect={() => {}}
        />
      </Card>,
    );
    const genuinelyEmpty = renderHtml(
      <Card title="escrowed by chain">
        <LockedByChain
          data={[]}
          totalUsd={null}
          loading={false}
          selected={null}
          onSelect={() => {}}
        />
      </Card>,
    );

    expect(failed).not.toContain("nothing escrowed yet");
    expect(failed).toContain("reach the explorer");
    // The honest empty case is untouched — it still gets to say the pool is empty.
    expect(genuinelyEmpty).toContain("nothing escrowed yet");
  });
});

describe("LockedByChain shares", () => {
  const asset = (assetIdU64: number, lockedUsd: number | null): LockedAsset => ({
    assetIdU64,
    tokenHex: "aa",
    symbol: `T${assetIdU64}`,
    amount: 1,
    lockedUsd,
    lastTs: 0,
    basis: "flowDifference",
  });
  const chain = (chainId: number, assets: LockedAsset[]): ChainLocked => ({
    chainId,
    lockedUsd: assets.reduce((sum, a) => sum + (a.lockedUsd ?? 0), 0),
    unpricedAssets: assets.filter((a) => a.lockedUsd === null).length,
    assets,
  });
  const render = (data: ChainLocked[]) =>
    renderHtml(
      <LockedByChain
        data={data}
        totalUsd={summarizeLocked(data)?.totalUsd ?? null}
        loading={false}
        selected={null}
      />,
    );

  it("measures each asset against the whole pool, not its own chain", () => {
    const html = render([chain(1, [asset(1, 600), asset(2, 150)]), chain(10, [asset(3, 250)])]);
    expect(html).toContain(">60%<");
    expect(html).toContain(">15%<");
    // 100% of its chain, a quarter of the pool.
    expect(html).toContain(">25%<");
    expect(html).not.toContain(">100%<");
  });

  it("gives an unpriced asset no share rather than a zero", () => {
    const html = render([chain(1, [asset(1, 600), asset(2, null)])]);
    expect(html).toContain(">100%<");
    expect(html).not.toContain(">0%<");
  });
});
