/** The classified transaction feed, and its counts by kind. */

/** What a transaction did. Mutually exclusive; derived from contract events. */
export type TxKind = "deposit" | "pending" | "transfer" | "withdraw";

export const TX_KINDS: TxKind[] = ["deposit", "pending", "transfer", "withdraw"];

export interface TxOut {
  chainId: number;
  txHashHex: string;
  blockNumber: number;
  blockTs: number;
  kind: TxKind;
  /** null for transfers, which move no public value. */
  assetIdU64: number | null;
  /** Whole tokens as a decimal string; null for transfers and unknown decimals. */
  amount: string | null;
  /**
   * The circuit value this withdrawal published — the key its anonymity set is
   * grouped by. Join against `getAnonymitySets` on
   * `(chainId, assetIdU64, publicOut)` for the cohort size.
   *
   * null for every non-withdrawal kind, and for a withdrawal indexed before the
   * contract emitted the field. Both mean the denomination is unknown, which is
   * not the same as a cohort of zero.
   *
   * Kept as a string: the value is a uint64, so `Number()` would round two
   * distinct denominations together at the top of the range.
   */
  publicOut: string | null;
}

export interface KindCounts {
  ts: number;
  deposit: number;
  pending: number;
  transfer: number;
  withdraw: number;
}

export interface RecentTxQuery {
  chainId?: number;
  sinceTs?: number;
  /** One kind only; absent = every kind. Filtered before `limit` applies, so
   *  a pinned kind still comes back a full page at a time. */
  kind?: TxKind;
  limit?: number;
}
