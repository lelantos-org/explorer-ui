import {
  type AnonymitySet,
  type AssetOut,
  type ChainFlow,
  type ChainLocked,
  type CountPoint,
  type FlowPoint,
  type KindCounts,
  type PoolNotes,
  type TxOut,
  useApi,
} from "../api";
import { COHORT_LIMIT, RECENT_WINDOW_SEC } from "../lib/anonymity";
import { ALL_KINDS, type KindFilter } from "../lib/kinds";
import type { Range } from "../lib/ranges";
import type { Scope } from "../lib/scope";
import { rangeDomain, type TimeDomain } from "../lib/time";
import { type Async, useAsync } from "./useAsync";

/**
 * How often the page re-reads the backend.
 *
 * Every series refreshes on the same interval, so no two cards can drift into
 * describing different moments — a chart and the tiles above it disagreeing is
 * worse than both being a little stale.
 */
const REFRESH_MS = 30_000;

const live = { refetchMs: REFRESH_MS };

/** `null` is "unscoped" throughout the app; the wire spells that as an absent
 *  param, so every query converts at exactly this boundary. */
const param = (id: number | null): number | undefined => id ?? undefined;

export function useAssets(): Async<AssetOut[]> {
  const api = useApi();
  return useAsync(() => api.listAssets(), [api], live);
}

export function useChainFlows24h(): Async<ChainFlow[]> {
  const api = useApi();
  return useAsync(() => api.getChainFlows24h(), [api], live);
}

/**
 * Escrowed balances per chain. Unscoped on purpose: the card is the network-wide
 * view, and the filter bar's chain only narrows the series above it.
 */
export function useLocked(): Async<ChainLocked[]> {
  const api = useApi();
  return useAsync(() => api.getLocked(), [api], live);
}

/** The classified feed, newest first. `ALL_KINDS` sends no `kind` param at all:
 *  the backend rejects a kind it does not know, empty string included. */
export function useRecentTx(limit = 20, kind: KindFilter = ALL_KINDS): Async<TxOut[]> {
  const api = useApi();
  return useAsync(
    () => api.getRecentTransactions({ limit, kind: kind || undefined }),
    [api, limit, kind],
    live,
  );
}

/** Kind counts over time. Chain-scoped only: `/v1/tx-kinds` takes no asset. */
export function useTxKinds(chainId: number | null, range: Range): Async<KindCounts[]> {
  const api = useApi();
  return useAsync(
    () =>
      api.getTxKinds({
        chainId: param(chainId),
        bucketSec: range.bucket,
        sinceTs: rangeDomain(range).start,
      }),
    [api, chainId, range.label],
    live,
  );
}

/**
 * The backend's own maximum page.
 *
 * These rows are a lookup table as much as a list: the feed joins every
 * withdrawal against them to report its k, so a page that stopped short would
 * leave the rows past the cut reporting an unknown cohort. Off-ladder
 * withdrawals each make a denomination of their own, so the row count tracks
 * how *unlike* a ladder the pool's usage is rather than the ladder's size.
 */
/**
 * Withdrawal cohorts per denomination.
 *
 * Deliberately not windowed by the range: an anonymity set is every withdrawal
 * of that size in the pool's history, so narrowing it to the visible range would
 * report a smaller k than a user actually has.
 */
export function useAnonymitySets(scope: Scope): Async<AnonymitySet[]> {
  const api = useApi();
  const { chainId, assetIdU64 } = scope;
  return useAsync(
    () =>
      api.getAnonymitySets({
        chainId: param(chainId),
        assetIdU64: param(assetIdU64),
        limit: COHORT_LIMIT,
        // Sent explicitly rather than left to the backend's default: the UI
        // writes the label, so it has to own the number.
        recentSec: RECENT_WINDOW_SEC,
      }),
    [api, chainId, assetIdU64],
    live,
  );
}

/** Tree occupancy per chain. Unscoped shows every chain, which is the only
 *  correct way to read counts that must never be summed together. */
export function usePoolNotes(chainId: number | null): Async<PoolNotes[]> {
  const api = useApi();
  return useAsync(() => api.getPoolNotes(param(chainId)), [api, chainId], live);
}

export interface FlowAndTx {
  flows: FlowPoint[];
  counts: CountPoint[];
  /** The window both series were requested for. It comes back with the data
   *  rather than being set up front, so the axis can never describe a range the
   *  points are not from. */
  domain: TimeDomain;
}

/**
 * Flows and tx counts as one request pair: they share an axis, so a partial
 * result would draw two charts over different windows.
 */
export function useFlowAndTx(scope: Scope, range: Range): Async<FlowAndTx> {
  const api = useApi();
  const { chainId, assetIdU64 } = scope;
  return useAsync(
    async () => {
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
      return { flows, counts, domain };
    },
    [api, chainId, assetIdU64, range.label],
    live,
  );
}
