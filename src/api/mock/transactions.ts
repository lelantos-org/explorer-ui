import type { AssetOut, RecentTxQuery, TxKind, TxOut } from "../types";
import type { TreeAdvance } from "./generate";

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
      kind,
      assetIdU64: movesValue ? asset.assetIdU64 : null,
      amount: movesValue ? (((i % AMOUNT_STEPS) + 1) / 4).toString() : null,
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
