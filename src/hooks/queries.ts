import type { AssetOut, ChainFlow, CountPoint, FlowPoint, KindCounts, TxKind, TxOut } from "../api";
import { useApi } from "../api";
import type { Range } from "../lib/ranges";
import { rangeDomain, type TimeDomain } from "../lib/time";
import { type Async, useAsync } from "./useAsync";

/**
 * How often the page re-reads the backend. The header's health dot polls, so
 * the figures beside it have to as well — a "live" badge over a snapshot taken
 * at page load is worse than no badge.
 */
const REFRESH_MS = 30_000;

const live = { refetchMs: REFRESH_MS };

export function useAssets(): Async<AssetOut[]> {
  const api = useApi();
  return useAsync(() => api.listAssets(), [api], live);
}

export function useChainFlows24h(): Async<ChainFlow[]> {
  const api = useApi();
  return useAsync(() => api.getChainFlows24h(), [api], live);
}

/** `kind` empty means every kind — the param is dropped rather than sent. */
export function useRecentTx(limit = 20, kind: TxKind | "" = ""): Async<TxOut[]> {
  const api = useApi();
  return useAsync(
    () => api.getRecentTransactions({ limit, ...(kind ? { kind } : {}) }),
    [api, limit, kind],
    live,
  );
}

export function useTxKinds(chainId: string, range: Range): Async<KindCounts[]> {
  const api = useApi();
  return useAsync(
    () =>
      api.getTxKinds({
        chainId: chainId ? Number(chainId) : undefined,
        bucketSec: range.bucket,
        sinceTs: rangeDomain(range).start,
      }),
    [api, chainId, range.sec, range.bucket],
    live,
  );
}

export interface FlowAndTx {
  flows: FlowPoint[];
  counts: CountPoint[];
  /** The window both series were requested for. It comes back with the data
   *  rather than being set up front, so the axis can never describe a range the
   *  points are not from. */
  domain: TimeDomain;
}

export interface FlowAndTxQuery {
  chainId: string;
  assetIdU64: string;
  range: Range;
}

/**
 * Flows and tx counts as one request pair: they share an axis, so a partial
 * result would draw two charts over different windows.
 */
export function useFlowAndTx({ chainId, assetIdU64, range }: FlowAndTxQuery): Async<FlowAndTx> {
  const api = useApi();
  return useAsync(
    async () => {
      const domain = rangeDomain(range);
      const query = {
        chainId: chainId ? Number(chainId) : undefined,
        bucketSec: range.bucket,
        sinceTs: domain.start,
      };
      const [flows, counts] = await Promise.all([
        api.getAssetFlows({ ...query, assetIdU64: assetIdU64 ? Number(assetIdU64) : undefined }),
        api.getTxCounts(query),
      ]);
      return { flows, counts, domain };
    },
    [api, chainId, assetIdU64, range.sec, range.bucket],
    live,
  );
}
