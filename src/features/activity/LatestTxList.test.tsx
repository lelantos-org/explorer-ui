import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnonymitySet, AssetOut, TxKind, TxOut } from "@/api";
import { ALL_KINDS } from "@/lib/kinds";
import { assetRow, cohortRow } from "@/test/fixtures";
import LatestTxList from "./LatestTxList";

const tx = (kind: TxKind, over: Partial<TxOut> = {}): TxOut => ({
  chainId: 1,
  txHashHex: `${kind.padEnd(8, "0")}`.repeat(8).slice(0, 64),
  blockNumber: 100,
  blockTs: Math.floor(Date.now() / 1000),
  kind,
  assetIdU64: kind === "transfer" ? null : 1000,
  amount: kind === "transfer" ? null : "10",
  publicOut: kind === "withdraw" ? "500" : null,
  ...over,
});

const cohort = (count: number, publicOut = "500", recentCount = count): AnonymitySet =>
  cohortRow({ count, publicOut, recentCount });

const render = (data: TxOut[], cohorts: AnonymitySet[] | null = [cohort(42)]) =>
  renderToString(
    <LatestTxList data={data} assets={null} cohorts={cohorts} loading={false} kind={ALL_KINDS} />,
  ).replaceAll("<!-- -->", "");

const registered = (assetIdU64: number): AssetOut =>
  assetRow({
    assetIdU64,
    tokenHex: "9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
    scale: "10000000000",
    decimals: 18,
    symbol: "WETH",
  });

describe("LatestTxList asset cell", () => {
  it("names the circuit id the privacy column was computed from", () => {
    // Two ids can share a token, a symbol and an address while being separate
    // anonymity sets, so the same denomination of the "same" asset can carry
    // two different k's. Without the id the feed shows that difference with no
    // visible cause, and the rows read as a contradiction.
    const html = renderToString(
      <LatestTxList
        data={[tx("withdraw", { assetIdU64: 4 })]}
        assets={[registered(1), registered(4)]}
        cohorts={[cohort(42)]}
        loading={false}
        kind={ALL_KINDS}
      />,
    ).replaceAll("<!-- -->", "");
    expect(html).toContain("#4");
  });
});

describe("LatestTxList privacy column", () => {
  /**
   * The column reports an anonymity set, and only a withdrawal has one. Giving
   * the other kinds a reading would score them on an axis they are not on.
   */
  it("shows a reading for withdrawals and a plain dash for everything else", () => {
    expect(render([tx("withdraw")])).toContain("k = 42");
    for (const kind of ["transfer", "deposit", "pending"] as const) {
      const html = render([tx(kind)]);
      expect(html).not.toContain("priv--");
      expect(html).toContain("—");
    }
  });

  it("tones a thin and a unique cohort apart from a healthy one", () => {
    expect(render([tx("withdraw")], [cohort(42)])).toContain("priv--counted");
    expect(render([tx("withdraw")], [cohort(4)])).toContain("priv--thin");
    expect(render([tx("withdraw")], [cohort(1)])).toContain("priv--unique");
  });

  /**
   * The regression worth guarding at the render layer as well as in `lib`: a
   * withdrawal indexed before the contract emitted `publicOut` has an unknown
   * denomination, and the cell must not print a cohort of zero or claim the
   * withdrawal was unique.
   */
  it("renders an unrecorded denomination as unknown, never as k = 0", () => {
    const html = render([tx("withdraw", { publicOut: null })]);
    expect(html).toContain("not indexed");
    expect(html).toContain("priv--unknown");
    expect(html).not.toContain("k = 0");
    expect(html).not.toContain("unique");
  });

  it("reports unknown rather than guessing while the cohorts are still loading", () => {
    // Null cohorts is "not in yet", not "nobody else withdrew this".
    const html = render([tx("withdraw")], null);
    expect(html).toContain("priv--unknown");
    expect(html).not.toContain("priv--unique");
  });

  it("keeps the column in the header", () => {
    // Matched on the cell's text rather than its exact tag: the point is that
    // the column is present, not how the header happens to be attributed.
    expect(render([tx("transfer")])).toMatch(/<th[^>]*>privacy<\/th>/);
  });
});
