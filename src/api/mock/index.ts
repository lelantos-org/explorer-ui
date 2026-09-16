import type {
  AnonymitySet,
  AnonymitySetQuery,
  AssetOut,
  ChainFlow,
  ChainLocked,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowPoint,
  FlowQuery,
  KindCounts,
  PoolNotes,
  RecentTxQuery,
  TxOut,
  YieldAsset,
} from "../types";
import { chainFlows24h } from "./endpoints/chainFlows";
import { assetFlows, selectFlows, txCounts } from "./endpoints/flows";
import { lockedByChain } from "./endpoints/locked";
import { anonymitySets, poolNotes } from "./endpoints/privacy";
import { classifyTransactions, selectTransactions, txKinds } from "./endpoints/transactions";
import { yieldAssets } from "./endpoints/yield";
import { buildTreeAdvances } from "./generate/advances";
import { buildAssets } from "./generate/assets";
import { buildHourlyFlows, HOURS_OF_HISTORY } from "./generate/flows";
import { mulberry32 } from "./generate/rng";

export interface MockApiOpts {
  latencyMs?: number;
  failureRate?: number;
  seed?: number;
  healthy?: boolean;
  /**
   * Unix seconds to generate the dataset around. Defaults to the wall clock.
   *
   * `seed` alone does NOT make the dataset reproducible: timestamps derive from
   * this instead, so two instances built with the same seed a second apart
   * disagree on every generated `priceAt` and bucket boundary. Pin it whenever
   * two instances are compared.
   */
  nowSec?: number;
}

const DEFAULT_LATENCY_MS = 200;
const DEFAULT_SEED = 0xdeadbeef;

export function createMockApi(opts: MockApiOpts = {}): ExplorerApi {
  const {
    latencyMs = DEFAULT_LATENCY_MS,
    failureRate = 0,
    healthy = true,
    seed = DEFAULT_SEED,
  } = opts;

  const rng = mulberry32(seed);
  // Failure injection draws from its own stream: sharing `rng` would make the
  // dataset depend on how many requests happened to fail, which defeats the seed.
  const chaos = mulberry32(seed ^ 0x9e3779b9);

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const generated = buildAssets(rng, now);
  const assets = generated.map((g) => g.asset);
  const flows = buildHourlyFlows(rng, generated, HOURS_OF_HISTORY, now);
  // Hoisted rather than inlined: the privacy figures read the advances
  // directly, and re-generating them would draw from `rng` again and produce a
  // second, different tree.
  const advances = buildTreeAdvances(rng, flows);
  const transactions = classifyTransactions(advances, assets);
  const priceOf = new Map(assets.map((a) => [a.assetIdU64, a.priceUsd]));
  const assetChainIds = assets.map((a) => a.chainId);

  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs));

  /** Every endpoint but `health` goes through here: the latency, and the
   *  injected failure that exercises the error paths. */
  const respond = async () => {
    await wait();
    if (failureRate > 0 && chaos() < failureRate) {
      throw new Error("503 mock: simulated failure");
    }
  };

  return {
    async health(): Promise<boolean> {
      await wait();
      return healthy;
    },

    async listAssets(chainId?: number): Promise<AssetOut[]> {
      await respond();
      const rows = chainId === undefined ? assets : assets.filter((a) => a.chainId === chainId);
      return rows.map((a) => ({ ...a }));
    },

    async getAssetFlows(q: FlowQuery): Promise<FlowPoint[]> {
      await respond();
      return assetFlows(selectFlows(flows, q), q.bucketSec, priceOf);
    },

    async getLocked(chainId?: number): Promise<ChainLocked[]> {
      await respond();
      // The bindings come from the same call the yield card reads, so the two
      // cards cannot report different balances for one asset.
      return lockedByChain(
        assets,
        selectFlows(flows, { chainId }),
        yieldAssets(assets, flows, now),
      );
    },

    async getYield(chainId?: number): Promise<YieldAsset[]> {
      await respond();
      // Built from the unfiltered flows and narrowed afterwards: an asset's
      // holdings are all-time, so scoping the flows first would shrink `gross`
      // to whatever the filter let through.
      const rows = yieldAssets(assets, flows, now);
      return chainId === undefined ? rows : rows.filter((r) => r.chainId === chainId);
    },

    async getTxCounts(q: CountQuery): Promise<CountPoint[]> {
      await respond();
      return txCounts(selectFlows(flows, { chainId: q.chainId, sinceTs: q.sinceTs }), q.bucketSec);
    },

    async getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]> {
      await respond();
      return selectTransactions(transactions, q);
    },

    async getTxKinds(q: CountQuery): Promise<KindCounts[]> {
      await respond();
      return txKinds(transactions, q);
    },

    async getAnonymitySets(q: AnonymitySetQuery): Promise<AnonymitySet[]> {
      await respond();
      return anonymitySets(transactions, q, now);
    },

    async getPoolNotes(chainId?: number): Promise<PoolNotes[]> {
      await respond();
      return poolNotes(advances, transactions, chainId);
    },

    async getChainFlows24h(): Promise<ChainFlow[]> {
      await respond();
      return chainFlows24h(flows, assetChainIds, now);
    },
  };
}
