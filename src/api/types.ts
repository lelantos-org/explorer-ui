/**
 * Wire types for the explorer backend, and the client interface over them.
 *
 * Every DTO the backend speaks lives here — there is no second types module.
 * Import them through `../api`, not from this file directly.
 */

export interface AssetOut {
  chainId: number;
  assetIdU64: number;
  tokenHex: string;
  /** Circuit capacity parameter, NOT a decimals normalizer. Never use this to
   *  render an amount — use `decimals`. */
  scale: string;
  /** ERC20 decimals. null = not yet resolved by the indexer; unknown, not 18. */
  decimals: number | null;
  /** Spot USD price of one whole token. null = unknown, never 0. */
  priceUsd: number | null;
  /** Provider timestamp for priceUsd. null whenever priceUsd is. */
  priceAt: number | null;
}

export interface FlowPoint {
  ts: number;
  /**
   * Whole tokens, present only when exactly one asset is in scope (pin one
   * with `assetIdU64`). null otherwise: amounts of different tokens are not
   * addable in any unit, so there is no cross-asset token total.
   */
  in: number | null;
  out: number | null;
  /**
   * USD across the assets that could be priced. null = nothing in the bucket
   * had a price. A non-zero `unpricedAssets` means these cover only part of
   * the volume in `in`/`out`.
   */
  inUsd: number | null;
  outUsd: number | null;
  unpricedAssets: number;
}

export interface CountPoint {
  ts: number;
  count: number;
}

export interface FlowQuery {
  chainId?: number;
  assetIdU64?: number;
  bucketSec?: number;
  sinceTs?: number;
}

export interface CountQuery {
  chainId?: number;
  bucketSec?: number;
  sinceTs?: number;
}

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
}

export interface KindCounts {
  ts: number;
  deposit: number;
  pending: number;
  transfer: number;
  withdraw: number;
}

export interface ChainFlow {
  chainId: number;
  inflow: number;
  outflow: number;
  hourlyIn: number[];
  hourlyOut: number[];
  txCount: number;
}

export interface RecentTxQuery {
  chainId?: number;
  sinceTs?: number;
  limit?: number;
}

/**
 * Everything the UI can ask the backend for.
 *
 * `/v1/tree-advances` is deliberately absent: the classified
 * `getRecentTransactions` feed replaced the client-side paging of raw tree
 * advances, and no screen reads them any more. The mock still synthesises
 * advances internally to derive that feed.
 */
export interface ExplorerApi {
  health(): Promise<boolean>;
  listAssets(chainId?: number): Promise<AssetOut[]>;
  getAssetFlows(q: FlowQuery): Promise<FlowPoint[]>;
  getTxCounts(q: CountQuery): Promise<CountPoint[]>;
  getChainFlows24h(): Promise<ChainFlow[]>;
  /** Newest-first classified feed. */
  getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]>;
  getTxKinds(q: CountQuery): Promise<KindCounts[]>;
}
