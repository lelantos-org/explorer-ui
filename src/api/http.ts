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
  LockedAsset,
  LockedBasis,
  PoolNotes,
  RecentTxQuery,
  TxOut,
  YieldAsset,
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

    // `publicOut` and `count` stay as the backend sent them: `publicOut` is a
    // uint64 string that must not be parsed, and `count` is a plain number.
    async getAnonymitySets(q: AnonymitySetQuery): Promise<AnonymitySet[]> {
      // `recentCount` is newer than the rest of the row, so a backend that has
      // not been redeployed omits it. Absent becomes `null` — unknown — rather
      // than being left `undefined` for the UI to trip over, and never zero,
      // which would report every cohort dormant on a version skew.
      type Wire = Omit<AnonymitySet, "recentCount"> & { recentCount?: number | null };
      const rows = await get<Wire[]>("/v1/anonymity-set", {
        chainId: q.chainId,
        assetIdU64: q.assetIdU64,
        limit: q.limit,
        recentSec: q.recentSec,
      });
      return rows.map((r) => ({ ...r, recentCount: r.recentCount ?? null }));
    },

    getPoolNotes: (chainId?: number) => get<PoolNotes[]>("/v1/pool-notes", { chainId }),

    getChainFlows24h: () => get<ChainFlow[]>("/v1/chain-flows-24h"),

    async getLocked(chainId?: number): Promise<ChainLocked[]> {
      // `amount` is a whole-token decimal string for the same reason the flow
      // amounts are: a balance can carry 18 decimals, which JSON numbers cannot
      // hold exactly. Dollars stay plain numbers.
      //
      // `basis` is newer than the rest of the row, so a backend that has not
      // been redeployed omits it. Defaulted to `flowDifference` rather than left
      // undefined: that is what such a backend was in fact reporting for every
      // asset, and it is the claim that needs no yield tables to be true.
      type LockedAssetWire = Omit<LockedAsset, "amount" | "basis"> & {
        amount: string | null;
        basis?: LockedBasis;
      };
      type ChainLockedWire = Omit<ChainLocked, "assets"> & { assets: LockedAssetWire[] };
      const rows = await get<ChainLockedWire[]>("/v1/locked", { chainId });
      return rows.map((c) => ({
        ...c,
        assets: c.assets.map((a) => ({
          ...a,
          amount: a.amount == null ? null : Number(a.amount),
          basis: a.basis ?? "flowDifference",
        })),
      }));
    },

    async getYield(chainId?: number): Promise<YieldAsset[]> {
      // Only the whole-token amounts are parsed. The normalized pair and
      // `indexRay` stay strings: they are 78-digit integers that JSON numbers
      // cannot hold, and nothing downstream does arithmetic on them — the index
      // is converted for display in `lib/yield`, from the string.
      type Wire = Omit<YieldAsset, "gross" | "idle" | "accruedFee"> & {
        gross: string | null;
        idle: string | null;
        accruedFee: string | null;
      };
      const rows = await get<Wire[]>("/v1/yield", { chainId });
      // `== null` for the same reason `getAssetFlows` uses it: an omitted field
      // would otherwise parse to NaN, which passes every null check downstream
      // and prints "NaN" where a dash belongs.
      const amount = (v: string | null) => (v == null ? null : Number(v));
      return rows.map((r) => ({
        ...r,
        gross: amount(r.gross),
        idle: amount(r.idle),
        accruedFee: amount(r.accruedFee),
      }));
    },
  };
}
