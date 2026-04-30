import type { AssetOut, TreeAdvanceOut } from "../types";

export interface ListTreeAdvancesOpts {
  chainId?: number;
  sinceStartIndex?: number;
  limit?: number;
}

export interface FlowPoint {
  ts: number;
  in: number;
  out: number;
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

export interface ChainFlow {
  chainId: number;
  inflow: number;
  outflow: number;
  hourlyIn: number[];
  hourlyOut: number[];
  txCount: number;
}

export interface ExplorerApi {
  health(): Promise<boolean>;
  listAssets(chainId?: number): Promise<AssetOut[]>;
  listTreeAdvances(opts: ListTreeAdvancesOpts): Promise<TreeAdvanceOut[]>;
  getAssetFlows(q: FlowQuery): Promise<FlowPoint[]>;
  getTxCounts(q: CountQuery): Promise<CountPoint[]>;
  getChainFlows24h(): Promise<ChainFlow[]>;
  getRecentTreeAdvances(limit: number): Promise<TreeAdvanceOut[]>;
}
