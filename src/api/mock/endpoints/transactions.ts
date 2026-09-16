import type { AssetOut, CountQuery, KindCounts, RecentTxQuery, TxKind, TxOut } from "../../types";
import type { TreeAdvance } from "../generate/advances";
import { bucketize } from "./bucket";

/**
 * Which kind an advance is classified as, by position.
 *
 * The backend decides this from the events behind the advance: one with a
 * matching asset flow is a withdraw, one without is a transfer; deposits are
 * counted at flush time, and escrows still awaiting a flush are pending. The
 * mock has no events to inspect, so it cycles a fixed pattern instead —
 * deterministic, and wide enough that every badge and every filter option has
 * rows behind it.
 */
const KIND_CYCLE: TxKind[] = [
  "withdraw",
  "deposit",
  "pending",
  "transfer",
  "transfer",
  "transfer",
  "transfer",
];

/** Total by construction: the index is taken modulo the cycle's own length. */
const kindAt = (i: number): TxKind => KIND_CYCLE[i % KIND_CYCLE.length] ?? "transfer";

/** Amounts cycle over a fixed ladder of quarter-tokens, so a page of the feed
 *  shows a spread of magnitudes rather than one repeated figure. */
const AMOUNT_STEPS = 40;

/**
 * A withdrawal denomination ladder in circuit units: `{1, 2, 5} x 10^e`, the
 * shape `docs/src/guide/denominations.md` describes.
 *
 * Circuit units, not whole tokens. A denomination is a fixed integer precisely
 * so it does not move when the yield index does, which is what lets withdrawals
 * from different times share one anonymity set.
 */
const LADDER = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

/**
 * Which denomination a withdrawal publishes, weighted toward the middle rungs.
 *
 * Real ladders are not used evenly: the middle carries most of the volume while
 * the extremes are thin. Reproducing that is the point of the mock here — a flat
 * distribution would give every denomination a healthy cohort and the UI's
 * thin-set warning would never render without a live backend.
 */
const DENOM_CYCLE: number[] = LADDER.flatMap((denom, i) => {
  const distance = Math.abs(i - (LADDER.length - 1) / 2);
  const weight = Math.max(1, Math.round(LADDER.length - 2 * distance));
  return Array<number>(weight).fill(denom);
});

/** Every 23rd withdrawal goes off-ladder, publishing an integer nobody else
 *  does. Coprime with the kind cycle's 7, so the two patterns do not align.
 *  These are the `k = 1` rows: a unique `publicOut` is linkable to the deposit
 *  that funded it, which is the case the UI most needs to surface. */
const OFF_LADDER_EVERY = 23;

/** The oldest advances predate the contract emitting `publicIn`/`publicOut`, so
 *  their denomination is unknown rather than zero — the distinction the
 *  `public_out IS NOT NULL` filter rests on, and a path the UI must render as
 *  unknown rather than as a cohort of nothing. */
const UNINDEXED_BEFORE = 40;

/** The denomination a withdrawal at position `i` published, or null when the
 *  indexer never observed one. */
function denominationAt(i: number): string | null {
  if (i < UNINDEXED_BEFORE) return null;
  if (i % OFF_LADDER_EVERY === 0) return String(3_333 + i);
  return String(DENOM_CYCLE[i % DENOM_CYCLE.length] ?? 1);
}

/** The classified feed, derived from tree advances the way the backend derives
 *  it. Ordering is left to `selectTransactions`, which sorts newest-first. */
export function classifyTransactions(advances: TreeAdvance[], assets: AssetOut[]): TxOut[] {
  return advances.map((advance, i) => {
    const kind = kindAt(i);
    const asset = assets[i % assets.length];
    // Transfers move no public value, so they name no asset and no amount.
    const movesValue = kind !== "transfer" && asset !== undefined;
    return {
      chainId: advance.chainId,
      txHashHex: advance.txHashHex,
      blockNumber: advance.blockNumber,
      blockTs: advance.blockTs,
      logIndex: advance.logIndex,
      kind,
      assetIdU64: movesValue ? asset.assetIdU64 : null,
      amount: movesValue ? (((i % AMOUNT_STEPS) + 1) / 4).toString() : null,
      // Only a withdrawal publishes a denomination. A deposit's amount is
      // public but it is not drawn from a ladder, and a transfer publishes no
      // value at all.
      publicOut: kind === "withdraw" ? denominationAt(i) : null,
    };
  });
}

const DEFAULT_LIMIT = 100;

/** Newest-first, narrowed to the query. */
export function selectTransactions(transactions: TxOut[], q: RecentTxQuery): TxOut[] {
  return transactions
    .filter(
      (t) =>
        (q.chainId === undefined || t.chainId === q.chainId) &&
        (q.sinceTs === undefined || t.blockTs >= q.sinceTs) &&
        // Before the slice, as the backend filters before its LIMIT: a pinned
        // kind returns a full page, not the survivors of a mixed one.
        (q.kind === undefined || t.kind === q.kind),
    )
    .sort((a, b) => b.blockTs - a.blockTs)
    .slice(0, q.limit ?? DEFAULT_LIMIT);
}

const HOUR = 3600;

/** Every transaction the kind chart can bucket. Well above what any range
 *  holds, so the plot is never truncated by paging rather than by the range. */
const KIND_SCAN_LIMIT = 1000;

/** Transaction counts split by kind, mirroring `/v1/tx-kinds`: the same rows the
 *  feed serves, so a bar and the badges under it cannot disagree. */
export function txKinds(transactions: TxOut[], q: CountQuery): KindCounts[] {
  const rows = selectTransactions(transactions, {
    chainId: q.chainId,
    sinceTs: q.sinceTs,
    limit: KIND_SCAN_LIMIT,
  });
  return bucketize(
    rows,
    q.bucketSec ?? HOUR,
    (t) => t.blockTs,
    (ts) => ({ ts, deposit: 0, pending: 0, transfer: 0, withdraw: 0 }),
    (acc, t) => {
      acc[t.kind] += 1;
    },
  );
}
