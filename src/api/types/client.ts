import type { AssetOut } from "./assets";
import type { ChainLocked, YieldAsset } from "./custody";
import type { ChainFlow, CountPoint, CountQuery, FlowPoint, FlowQuery } from "./flows";
import type { AnonymitySet, AnonymitySetQuery, PoolNotes } from "./privacy";
import type { KindCounts, RecentTxQuery, TxOut } from "./transactions";

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
  /** Escrowed balances per chain, richest first. All chains when unscoped. */
  getLocked(chainId?: number): Promise<ChainLocked[]>;
  /** Newest-first classified feed. */
  getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]>;
  getTxKinds(q: CountQuery): Promise<KindCounts[]>;
  /** Withdrawal cohorts per denomination, over all history. Unscoped returns
   *  every chain and asset, which is what the feed needs to annotate itself. */
  getAnonymitySets(q: AnonymitySetQuery): Promise<AnonymitySet[]>;
  /** Tree occupancy, one row per chain. */
  getPoolNotes(chainId?: number): Promise<PoolNotes[]>;
  /** Yield-bearing assets, in registry order. Unscoped returns every chain,
   *  which is the network-wide view the card wants. */
  getYield(chainId?: number): Promise<YieldAsset[]>;
}
