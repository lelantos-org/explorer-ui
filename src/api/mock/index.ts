import type {
  AssetOut,
  ChainFlow,
  ChainLocked,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowPoint,
  FlowQuery,
  KindCounts,
  RecentTxQuery,
  TxOut,
} from "../types";
import { bucketize } from "./bucket";
import { chainFlows24h } from "./chainFlows";
import {
  buildAssets,
  buildHourlyFlows,
  buildTreeAdvances,
  type FlowRow,
  HOURS_OF_HISTORY,
  mulberry32,
} from "./generate";
import { lockedByChain } from "./locked";
import { classifyTransactions, selectTransactions } from "./transactions";

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
const DAY = 86400;
const HOUR = 3600;

/** Every transaction the kind chart can bucket. Well above what any range
 *  holds, so the plot is never truncated by paging rather than by the range. */
const KIND_SCAN_LIMIT = 1000;

/**
 * A flow bucket under construction. Token amounts accumulate unconditionally
 * and are dropped at the end when more than one asset is in scope, which is
 * cheaper than branching per row — and `unpriced` collects assets rather than
 * counting them, so an asset seen twice in a bucket is still one gap.
 */
interface FlowAcc {
  ts: number;
  in: number;
  out: number;
  inUsd: number | null;
  outUsd: number | null;
  unpriced: Set<number>;
}

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
  const transactions = classifyTransactions(buildTreeAdvances(rng, flows), assets);
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

  const selectFlows = (q: FlowQuery): FlowRow[] =>
    flows.filter(
      (r) =>
        (q.chainId === undefined || r.chainId === q.chainId) &&
        (q.assetIdU64 === undefined || r.assetIdU64 === q.assetIdU64) &&
        (q.sinceTs === undefined || r.ts >= q.sinceTs),
    );

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
      const rows = selectFlows(q);
      // Mirror the backend contract: token amounts exist only when exactly one
      // asset is in scope, because amounts of different tokens are not addable
      // in any unit. Dollars are converted per asset, then summed; an asset
      // with no price counts toward `unpricedAssets` instead of silently
      // vanishing from the total.
      const singleAsset = new Set(rows.map((r) => r.assetIdU64)).size <= 1;
      const buckets = bucketize<FlowRow, FlowAcc>(
        rows,
        q.bucketSec ?? DAY,
        (r) => r.ts,
        (ts) => ({ ts, in: 0, out: 0, inUsd: null, outUsd: null, unpriced: new Set() }),
        (acc, r) => {
          acc.in += r.inAmt;
          acc.out += r.outAmt;
          const price = priceOf.get(r.assetIdU64) ?? null;
          if (price === null) {
            acc.unpriced.add(r.assetIdU64);
          } else {
            acc.inUsd = (acc.inUsd ?? 0) + r.inAmt * price;
            acc.outUsd = (acc.outUsd ?? 0) + r.outAmt * price;
          }
        },
      );
      return buckets.map((b) => ({
        ts: b.ts,
        in: singleAsset ? b.in : null,
        out: singleAsset ? b.out : null,
        inUsd: b.inUsd,
        outUsd: b.outUsd,
        unpricedAssets: b.unpriced.size,
      }));
    },

    async getLocked(chainId?: number): Promise<ChainLocked[]> {
      await respond();
      return lockedByChain(assets, selectFlows({ chainId }));
    },

    async getTxCounts(q: CountQuery): Promise<CountPoint[]> {
      await respond();
      return bucketize(
        selectFlows({ chainId: q.chainId, sinceTs: q.sinceTs }),
        q.bucketSec ?? HOUR,
        (r) => r.ts,
        (ts) => ({ ts, count: 0 }),
        (acc, r) => {
          acc.count += r.txCount;
        },
      );
    },

    async getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]> {
      await respond();
      return selectTransactions(transactions, q);
    },

    async getTxKinds(q: CountQuery): Promise<KindCounts[]> {
      await respond();
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
    },

    async getChainFlows24h(): Promise<ChainFlow[]> {
      await respond();
      return chainFlows24h(flows, assetChainIds, now);
    },
  };
}
