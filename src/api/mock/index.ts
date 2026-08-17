import type {
  AssetOut,
  ChainFlow,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowPoint,
  FlowQuery,
  KindCounts,
  RecentTxQuery,
  TxKind,
  TxOut,
} from "../types";
import {
  buildAssets,
  buildHourlyFlows,
  buildTreeAdvances,
  type FlowRow,
  HOURS_OF_HISTORY,
  mulberry32,
} from "./generate";

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

/** Floor a timestamp onto its bucket's start. */
const bucketOf = (ts: number, bucket: number) => Math.floor(ts / bucket) * bucket;

/** Slots in the `/v1/chain-flows-24h` window, oldest first. */
const WINDOW_HOURS = 24;

const zeroHours = () => new Array<number>(WINDOW_HOURS).fill(0);

/**
 * Oldest hour of the 24-hour window, anchored so the hour containing `ts` lands
 * in the last slot — as the backend anchors it. Anchoring on `ts - 86400`
 * instead spans 25 distinct hours, and the newest has nowhere to go but the last
 * slot alongside the hour before it.
 */
const windowStart = (ts: number) => bucketOf(ts, 3600) - (WINDOW_HOURS - 1) * 3600;

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

/** Fold rows into per-bucket accumulators, returned in ascending bucket order. */
function bucketize<Row, Acc>(
  rows: Row[],
  bucket: number,
  tsOf: (r: Row) => number,
  init: (ts: number) => Acc,
  fold: (acc: Acc, r: Row) => void,
): Acc[] {
  const map = new Map<number, Acc>();
  for (const r of rows) {
    const k = bucketOf(tsOf(r), bucket);
    let cur = map.get(k);
    if (!cur) {
      cur = init(k);
      map.set(k, cur);
    }
    fold(cur, r);
  }
  return [...map.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
}

export function createMockApi(opts: MockApiOpts = {}): ExplorerApi {
  const latency = opts.latencyMs ?? 200;
  const failureRate = opts.failureRate ?? 0;
  const healthy = opts.healthy ?? true;
  const seed = opts.seed ?? 0xdeadbeef;

  const rng = mulberry32(seed);
  // Failure injection draws from its own stream: sharing `rng` would make the
  // dataset depend on how many requests happened to fail, which defeats the seed.
  const chaos = mulberry32(seed ^ 0x9e3779b9);

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const assets = buildAssets(rng, now);
  const flows = buildHourlyFlows(rng, assets, HOURS_OF_HISTORY, now);
  const advances = buildTreeAdvances(rng, flows);
  const priceOf = new Map(assets.map((a) => [a.assetIdU64, a.priceUsd]));

  const wait = () => new Promise<void>((r) => setTimeout(r, latency));
  const maybeFail = () => {
    if (failureRate > 0 && chaos() < failureRate) {
      throw new Error("503 mock: simulated failure");
    }
  };
  const respond = async () => {
    await wait();
    maybeFail();
  };

  /**
   * The classified feed, derived from tree advances the way the backend does:
   * an advance with a matching asset flow is a withdraw, one without is a
   * transfer; deposits are counted at flush time and escrows still awaiting a
   * flush are pending. The modulus split is deterministic so the mock exercises
   * every badge.
   */
  const allTransactions: TxOut[] = advances.map((t, i) => {
    const kind: TxKind =
      i % 7 === 0 ? "withdraw" : i % 7 === 1 ? "deposit" : i % 7 === 2 ? "pending" : "transfer";
    const asset = assets[i % assets.length];
    const movesValue = kind !== "transfer";
    return {
      chainId: t.chainId,
      txHashHex: t.txHashHex,
      blockNumber: t.blockNumber,
      blockTs: t.blockTs,
      kind,
      assetIdU64: movesValue ? asset.assetIdU64 : null,
      amount: movesValue ? (((i % 40) + 1) / 4).toString() : null,
    };
  });

  const selectTransactions = (q: RecentTxQuery): TxOut[] =>
    allTransactions
      .filter(
        (t) =>
          (q.chainId === undefined || t.chainId === q.chainId) &&
          (q.sinceTs === undefined || t.blockTs >= q.sinceTs),
      )
      .sort((a, b) => b.blockTs - a.blockTs)
      .slice(0, q.limit ?? 100);

  const selectFlows = (q: FlowQuery) =>
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
        q.bucketSec ?? 86400,
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

    async getTxCounts(q: CountQuery): Promise<CountPoint[]> {
      await respond();
      const rows = selectFlows({ chainId: q.chainId, sinceTs: q.sinceTs });
      return bucketize(
        rows,
        q.bucketSec ?? 3600,
        (r) => r.ts,
        (ts) => ({ ts, count: 0 }),
        (acc, r) => {
          acc.count += r.txCount;
        },
      );
    },

    async getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]> {
      await respond();
      return selectTransactions(q);
    },

    async getTxKinds(q: CountQuery): Promise<KindCounts[]> {
      await respond();
      const txs = selectTransactions({ chainId: q.chainId, sinceTs: q.sinceTs, limit: 1000 });
      return bucketize(
        txs,
        q.bucketSec ?? 3600,
        (t) => t.blockTs,
        (ts) => ({ ts, deposit: 0, pending: 0, transfer: 0, withdraw: 0 }),
        (acc, t) => {
          acc[t.kind] += 1;
        },
      );
    },

    async getChainFlows24h(): Promise<ChainFlow[]> {
      await respond();
      // Mirror the backend contract, which carries counts and no value:
      // `hourlyIn` is transactions per hour, `inflow`/`outflow`/`hourlyOut` are
      // reserved and 0. Summing each chain's token amounts here — the previous
      // shape — was the cross-asset total `getAssetFlows` refuses to produce, and
      // the grid drew its "vol" shares off it.
      //
      // The window is anchored on the instance's `now` rather than a fresh clock
      // read: reading here made it advance between calls, so `nowSec` did not
      // actually pin the dataset.
      const hourStart = windowStart(now);
      const chainIds = [...new Set(assets.map((a) => a.chainId))];

      return chainIds
        .map((chainId): ChainFlow => {
          const hourlyIn = zeroHours();
          let txCount = 0;
          for (const f of flows) {
            const slot = Math.floor((f.ts - hourStart) / 3600);
            // Out-of-window rows are dropped, not clamped: a clamped slot adds a
            // foreign hour's count to an edge bucket, which reads as real
            // activity in that hour.
            if (f.chainId !== chainId || slot < 0 || slot >= WINDOW_HOURS) continue;
            hourlyIn[slot] += f.txCount;
            txCount += f.txCount;
          }
          return { chainId, inflow: 0, outflow: 0, hourlyIn, hourlyOut: zeroHours(), txCount };
        })
        .sort((a, b) => b.txCount - a.txCount);
    },
  };
}
