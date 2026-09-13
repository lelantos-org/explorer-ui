import {
  type AnonymitySet,
  type AssetOut,
  type ChainFlow,
  type ChainLocked,
  type CountPoint,
  type ExplorerApi,
  type FlowPoint,
  type KindCounts,
  type PoolNotes,
  type TxOut,
  useApi,
  type YieldAsset,
} from "@/api";
import { REFRESH_MS } from "@/config";
import { COHORT_LIMIT, RECENT_WINDOW_SEC } from "@/lib/cover";
import { ALL_KINDS, type KindFilter } from "@/lib/kinds";
import type { Range } from "@/lib/ranges";
import type { Scope } from "@/lib/scope";
import { rangeDomain, type TimeDomain } from "@/lib/time";
import { type Async, useAsync } from "./useAsync";

/** `null` is "unscoped" throughout the app; the wire spells that as an absent
 *  param, so every query converts at exactly this boundary. */
const param = (id: number | null): number | undefined => id ?? undefined;

/**
 * A backend read, re-run on the page's shared interval.
 *
 * `deps` are the query's own inputs; the client is added here, so a hook lists
 * only what its request depends on.
 */
function usePolled<T>(read: (api: ExplorerApi) => Promise<T>, deps: unknown[]): Async<T> {
  const api = useApi();
  return useAsync(() => read(api), [api, ...deps], { refetchMs: REFRESH_MS });
}

export function useAssets(): Async<AssetOut[]> {
  return usePolled((api) => api.listAssets(), []);
}

export function useChainFlows24h(): Async<ChainFlow[]> {
  return usePolled((api) => api.getChainFlows24h(), []);
}

/**
 * Escrowed balances per chain. Unscoped on purpose: the card is the network-wide
 * view, and the filter bar's chain only narrows the series above it.
 */
export function useLocked(): Async<ChainLocked[]> {
  return usePolled((api) => api.getLocked(), []);
}

/** The classified feed, newest first. `ALL_KINDS` sends no `kind` param at all:
 *  the backend rejects a kind it does not know, empty string included. */
export function useRecentTx(limit: number, kind: KindFilter = ALL_KINDS): Async<TxOut[]> {
  return usePolled(
    (api) => api.getRecentTransactions({ limit, kind: kind || undefined }),
    [limit, kind],
  );
}

export interface TxKinds {
  counts: KindCounts[];
  /** The range and window these counts were requested for. They travel with
   *  the data, so while a new range loads the plot and its caption keep
   *  describing the counts on screen rather than the ones on their way. */
  range: Range;
  domain: TimeDomain;
}

/** Kind counts over time. Chain-scoped only: `/v1/tx-kinds` takes no asset. */
export function useTxKinds(chainId: number | null, range: Range): Async<TxKinds> {
  return usePolled(
    async (api) => {
      const domain = rangeDomain(range);
      const counts = await api.getTxKinds({
        chainId: param(chainId),
        bucketSec: range.bucket,
        sinceTs: domain.start,
      });
      return { counts, range, domain };
    },
    [chainId, range.label],
  );
}

/**
 * Withdrawal cohorts per denomination.
 *
 * Deliberately not windowed by the range: an anonymity set is every withdrawal
 * of that size in the pool's history, so narrowing it to the visible range would
 * report a smaller k than a user actually has.
 */
export function useAnonymitySets(scope: Scope): Async<AnonymitySet[]> {
  const { chainId, assetIdU64 } = scope;
  return usePolled(
    (api) =>
      api.getAnonymitySets({
        chainId: param(chainId),
        assetIdU64: param(assetIdU64),
        limit: COHORT_LIMIT,
        // Sent explicitly rather than left to the backend's default: the UI
        // writes the label, so it has to own the number.
        recentSec: RECENT_WINDOW_SEC,
      }),
    [chainId, assetIdU64],
  );
}

/**
 * Yield-bearing assets. Unscoped, like `useLocked`: the card is the
 * network-wide view of what earns, and the filter bar's chain narrows the series
 * above it rather than this list.
 */
export function useYield(): Async<YieldAsset[]> {
  return usePolled((api) => api.getYield(), []);
}

/** Tree occupancy per chain. Unscoped shows every chain, which is the only
 *  correct way to read counts that must never be summed together. */
export function usePoolNotes(chainId: number | null): Async<PoolNotes[]> {
  return usePolled((api) => api.getPoolNotes(param(chainId)), [chainId]);
}

export interface FlowAndTx {
  flows: FlowPoint[];
  counts: CountPoint[];
  /**
   * The window, range and scope both series were requested for.
   *
   * They come back with the data rather than being read from the filters, so
   * nothing describes a request the figures are not from: while a new range
   * loads over the old series, the axis, the tiles' labels and the caption
   * still name the range those figures cover. The picker already shows the
   * range on its way.
   */
  domain: TimeDomain;
  range: Range;
  scope: Scope;
}

/**
 * Flows and tx counts as one request pair: they share an axis, so a partial
 * result would draw two charts over different windows.
 */
export function useFlowAndTx(scope: Scope, range: Range): Async<FlowAndTx> {
  const { chainId, assetIdU64 } = scope;
  return usePolled(
    async (api) => {
      const domain = rangeDomain(range);
      const window = {
        chainId: param(chainId),
        bucketSec: range.bucket,
        sinceTs: domain.start,
      };
      const [flows, counts] = await Promise.all([
        // Only the flows take the asset: `/v1/tx-counts` is chain-scoped, so a
        // pinned asset narrows one series of the pair and not the other.
        api.getAssetFlows({ ...window, assetIdU64: param(assetIdU64) }),
        api.getTxCounts(window),
      ]);
      return { flows, counts, domain, range, scope };
    },
    [chainId, assetIdU64, range.label],
  );
}
