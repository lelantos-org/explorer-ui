import type { AssetOut, TreeAdvanceOut } from "../types";
import type {
  ChainFlow,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowPoint,
  FlowQuery,
  ListTreeAdvancesOpts,
} from "./types";

export interface HttpApiOpts {
  base?: string;
  fetchFn?: typeof fetch;
}

function buildUrl(base: string, path: string, params?: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const q = qs.toString();
  return `${base}${path}${q ? `?${q}` : ""}`;
}

function bucketize<T>(rows: T[], tsOf: (r: T) => number, bucketSec: number, sinceTs?: number) {
  const buckets = new Map<number, T[]>();
  for (const r of rows) {
    const ts = tsOf(r);
    if (sinceTs !== undefined && ts < sinceTs) continue;
    const k = Math.floor(ts / bucketSec) * bucketSec;
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]);
}

export function createHttpApi(opts: HttpApiOpts = {}): ExplorerApi {
  const base = opts.base ?? "";
  const f = opts.fetchFn ?? fetch.bind(globalThis);

  const get = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const res = await f(buildUrl(base, path, params), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  };

  const fetchAdvances = async (chainId?: number, sinceTs?: number) => {
    const all: TreeAdvanceOut[] = [];
    let cursor: number | undefined = undefined;
    for (let i = 0; i < 20; i++) {
      const page: TreeAdvanceOut[] = await get<TreeAdvanceOut[]>("/v1/tree-advances", {
        chain_id: chainId,
        since_start_index: cursor,
        limit: 1000,
      });
      if (page.length === 0) break;
      all.push(...page);
      const max: number = page.reduce<number>((m, r) => (r.start_index > m ? r.start_index : m), -1);
      if (max < 0 || page.length < 1000) break;
      cursor = max;
      if (sinceTs !== undefined && page[0].block_ts < sinceTs && page[page.length - 1].block_ts < sinceTs) break;
    }
    return sinceTs === undefined ? all : all.filter((r) => r.block_ts >= sinceTs);
  };

  return {
    health: () => f(`${base}/health`).then((r) => r.ok).catch(() => false),

    listAssets: (chainId?: number) => get<AssetOut[]>("/v1/assets", { chain_id: chainId }),

    listTreeAdvances: (o: ListTreeAdvancesOpts) =>
      get<TreeAdvanceOut[]>("/v1/tree-advances", {
        chain_id: o.chainId,
        since_start_index: o.sinceStartIndex,
        limit: o.limit,
      }),

    async getTxCounts(q: CountQuery): Promise<CountPoint[]> {
      const bucket = q.bucketSec ?? 3600;
      const rows = await fetchAdvances(q.chainId, q.sinceTs);
      return bucketize(rows, (r) => r.block_ts, bucket, q.sinceTs).map(([ts, arr]) => ({
        ts,
        count: arr.reduce((s, r) => s + r.inserted, 0),
      }));
    },

    async getAssetFlows(_q: FlowQuery): Promise<FlowPoint[]> {
      // Backend has no per-asset flow endpoint yet. Return empty.
      return [];
    },

    async getChainFlows24h(): Promise<ChainFlow[]> {
      // Backend lacks per-chain inflow/outflow. Derive tx count by chain only.
      const sinceTs = Math.floor(Date.now() / 1000) - 86400;
      const rows = await fetchAdvances(undefined, sinceTs);
      const map = new Map<number, ChainFlow>();
      for (const r of rows) {
        const slot = Math.max(0, Math.min(23, Math.floor((r.block_ts - sinceTs) / 3600)));
        const cur = map.get(r.chain_id) ?? {
          chainId: r.chain_id,
          inflow: 0,
          outflow: 0,
          hourlyIn: new Array(24).fill(0),
          hourlyOut: new Array(24).fill(0),
          txCount: 0,
        };
        cur.txCount += r.inserted;
        cur.hourlyIn[slot] += r.inserted;
        map.set(r.chain_id, cur);
      }
      return [...map.values()].sort((a, b) => b.txCount - a.txCount);
    },
  };
}
