import type {
  AnonymitySetQuery,
  AssetOut,
  ChainFlow,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowQuery,
  KindCounts,
  PoolNotes,
  RecentTxQuery,
  TxOut,
} from "../types";
import {
  type AnonymitySetWire,
  type ChainLockedWire,
  decodeAnonymitySets,
  decodeFlows,
  decodeLocked,
  decodeYield,
  type FlowPointWire,
  type YieldAssetWire,
} from "./decode";

export interface HttpApiOpts {
  /** Prefix for every path; empty means same-origin. */
  base?: string;
  /** Injected for tests; the global `fetch` otherwise. */
  fetchFn?: typeof fetch;
}

type QueryParams = Record<string, string | number | undefined>;

/** A path with its query string. An unset param is left out entirely rather
 *  than sent empty: the backend rejects `?kind=` as an unknown kind. */
function buildUrl(base: string, path: string, params?: QueryParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  return `${base}${path}${q ? `?${q}` : ""}`;
}

/** The explorer backend over HTTP. */
export function createHttpApi(opts: HttpApiOpts = {}): ExplorerApi {
  const base = opts.base ?? "";
  const f = opts.fetchFn ?? fetch.bind(globalThis);

  const get = async <T>(path: string, params?: QueryParams): Promise<T> => {
    const res = await f(buildUrl(base, path, params), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  };

  // Each query is spelled out field by field rather than spread, so a field
  // added to a query type is not sent until someone decides it should be.
  return {
    health: () =>
      f(`${base}/health`)
        .then((r) => r.ok)
        .catch(() => false),

    listAssets: (chainId?: number) => get<AssetOut[]>("/v1/assets", { chainId }),

    getAssetFlows: async (q: FlowQuery) =>
      decodeFlows(
        await get<FlowPointWire[]>("/v1/asset-flows", {
          chainId: q.chainId,
          assetIdU64: q.assetIdU64,
          bucketSec: q.bucketSec,
          sinceTs: q.sinceTs,
        }),
      ),

    getTxCounts: (q: CountQuery) =>
      get<CountPoint[]>("/v1/tx-counts", {
        chainId: q.chainId,
        bucketSec: q.bucketSec,
        sinceTs: q.sinceTs,
      }),

    getRecentTransactions: (q: RecentTxQuery) =>
      get<TxOut[]>("/v1/transactions", {
        chainId: q.chainId,
        sinceTs: q.sinceTs,
        kind: q.kind,
        limit: q.limit,
      }),

    getTxKinds: (q: CountQuery) =>
      get<KindCounts[]>("/v1/tx-kinds", {
        chainId: q.chainId,
        bucketSec: q.bucketSec,
        sinceTs: q.sinceTs,
      }),

    getAnonymitySets: async (q: AnonymitySetQuery) =>
      decodeAnonymitySets(
        await get<AnonymitySetWire[]>("/v1/anonymity-set", {
          chainId: q.chainId,
          assetIdU64: q.assetIdU64,
          limit: q.limit,
          recentSec: q.recentSec,
        }),
      ),

    getPoolNotes: (chainId?: number) => get<PoolNotes[]>("/v1/pool-notes", { chainId }),

    getChainFlows24h: () => get<ChainFlow[]>("/v1/chain-flows-24h"),

    getLocked: async (chainId?: number) =>
      decodeLocked(await get<ChainLockedWire[]>("/v1/locked", { chainId })),

    getYield: async (chainId?: number) =>
      decodeYield(await get<YieldAssetWire[]>("/v1/yield", { chainId })),
  };
}
