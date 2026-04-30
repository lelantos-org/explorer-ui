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

    getTxCounts: (q: CountQuery) =>
      get<CountPoint[]>("/v1/tx-counts", {
        chainId: q.chainId,
        bucketSec: q.bucketSec,
        sinceTs: q.sinceTs,
      }),

    async getAssetFlows(q: FlowQuery): Promise<FlowPoint[]> {
      // Backend returns amounts as decimal strings (uint256 can exceed JS f64
      // safe range). Parse to number for chart display — precision loss only
      // matters above 2^53 in token base units.
      const rows = await get<{ ts: number; in: string; out: string }[]>(
        "/v1/asset-flows",
        {
          chainId: q.chainId,
          assetIdU64: q.assetIdU64,
          bucketSec: q.bucketSec,
          sinceTs: q.sinceTs,
        },
      );
      return rows.map((r) => ({ ts: r.ts, in: Number(r.in), out: Number(r.out) }));
    },

    async getRecentTreeAdvances(limit: number): Promise<TreeAdvanceOut[]> {
      const sinceTs = Math.floor(Date.now() / 1000) - 86400;
      const rows = await fetchAdvances(undefined, sinceTs);
      return rows.sort((a, b) => b.block_ts - a.block_ts).slice(0, limit);
    },

    getChainFlows24h: () => get<ChainFlow[]>("/v1/chain-flows-24h"),
  };
}
