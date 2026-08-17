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
  LockedAsset,
  RecentTxQuery,
  TxOut,
} from "./types";

export interface HttpApiOpts {
  base?: string;
  fetchFn?: typeof fetch;
}

type QueryParams = Record<string, string | number | undefined>;

function buildUrl(base: string, path: string, params?: QueryParams) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  return `${base}${path}${q ? `?${q}` : ""}`;
}

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

  return {
    health: () =>
      f(`${base}/health`)
        .then((r) => r.ok)
        .catch(() => false),

    listAssets: (chainId?: number) => get<AssetOut[]>("/v1/assets", { chainId }),

    getTxCounts: (q: CountQuery) =>
      get<CountPoint[]>("/v1/tx-counts", {
        chainId: q.chainId,
        bucketSec: q.bucketSec,
        sinceTs: q.sinceTs,
      }),

    async getAssetFlows(q: FlowQuery): Promise<FlowPoint[]> {
      // `in`/`out` are whole-token decimal strings, and null unless exactly
      // one asset is in scope — there is no cross-asset token total. USD comes
      // as a plain number: dollar totals stay far below 2^53, so only the
      // token amounts need string transport.
      type FlowRowWire = Omit<FlowPoint, "in" | "out"> & {
        in: string | null;
        out: string | null;
      };
      const rows = await get<FlowRowWire[]>("/v1/asset-flows", {
        chainId: q.chainId,
        assetIdU64: q.assetIdU64,
        bucketSec: q.bucketSec,
        sinceTs: q.sinceTs,
      });
      // `== null`, not `=== null`: a backend that omits the field entirely would
      // otherwise parse to NaN, which passes every null check downstream and
      // prints "NaN" in the tiles instead of falling back to dollars.
      return rows.map((r) => ({
        ...r,
        in: r.in == null ? null : Number(r.in),
        out: r.out == null ? null : Number(r.out),
      }));
    },

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

    getChainFlows24h: () => get<ChainFlow[]>("/v1/chain-flows-24h"),

    async getLocked(chainId?: number): Promise<ChainLocked[]> {
      // `amount` is a whole-token decimal string for the same reason the flow
      // amounts are: a balance can carry 18 decimals, which JSON numbers cannot
      // hold exactly. Dollars stay plain numbers.
      type LockedAssetWire = Omit<LockedAsset, "amount"> & { amount: string | null };
      type ChainLockedWire = Omit<ChainLocked, "assets"> & { assets: LockedAssetWire[] };
      const rows = await get<ChainLockedWire[]>("/v1/locked", { chainId });
      return rows.map((c) => ({
        ...c,
        assets: c.assets.map((a) => ({
          ...a,
          amount: a.amount == null ? null : Number(a.amount),
        })),
      }));
    },
  };
}
