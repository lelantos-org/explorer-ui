import { useCallback, useMemo } from "react";
import { ALL_KINDS, isTxKind, type KindFilter } from "../lib/kinds";
import { type Range, type RangeLabel, resolveRange } from "../lib/ranges";
import { chainScope, EMPTY_SCOPE, isScoped, parseId, type Scope } from "../lib/scope";
import { setOrDelete, useSetUrlParams, useUrlParams } from "./useUrlState";

export interface Filters {
  /** The chain+asset selection; see `lib/scope`. */
  scope: Scope;
  range: Range;
  /** Kind pinned on the latest-transactions feed. Scopes that one card, not the
   *  page, so it is deliberately outside `hasFilter`. */
  txKind: KindFilter;
  /** Whether the page as a whole is narrowed — the scope only; see `txKind`. */
  hasFilter: boolean;
}

export interface FilterActions {
  setScope: (scope: Scope) => void;
  setRange: (label: RangeLabel) => void;
  setTxKind: (kind: KindFilter) => void;
  /** Pin a whole chain, or clear the scope with `null`. */
  selectChain: (chainId: number | null) => void;
  clear: () => void;
}

export type FilterState = Filters & FilterActions;

const PARAM_CHAIN = "chain";
const PARAM_ASSET = "asset";
const PARAM_RANGE = "range";
const PARAM_KIND = "kind";

/** An unknown `?kind=` reads as no filter — the backend rejects one it does not
 *  know, and a hand-edited URL should show the feed, not an error. */
function kindParam(value: string | null): KindFilter {
  return isTxKind(value) ? value : ALL_KINDS;
}

const idText = (id: number | null) => (id === null ? "" : String(id));

/**
 * The page's query state, held in the URL so a filtered view can be bookmarked
 * or shared.
 *
 * Every action keeps a stable identity across renders, so passing them down as
 * props does not defeat memoisation in the components that receive them.
 */
export function useFilters(): FilterState {
  const params = useUrlParams();
  const setParams = useSetUrlParams();

  const scope = useMemo<Scope>(() => {
    const chainId = parseId(params.get(PARAM_CHAIN));
    // An asset id is only unique within its chain, so it cannot outlive one.
    if (chainId === null) return EMPTY_SCOPE;
    return { chainId, assetIdU64: parseId(params.get(PARAM_ASSET)) };
  }, [params]);

  const range = resolveRange(params.get(PARAM_RANGE));
  const txKind = kindParam(params.get(PARAM_KIND));

  const setScope = useCallback(
    (next: Scope) =>
      setParams((p) => {
        setOrDelete(p, PARAM_CHAIN, idText(next.chainId));
        // The asset param cannot outlive its chain, so clearing the chain
        // clears it too rather than leaving a dangling `?asset=`.
        setOrDelete(p, PARAM_ASSET, next.chainId === null ? "" : idText(next.assetIdU64));
      }),
    [setParams],
  );

  const actions = useMemo<FilterActions>(
    () => ({
      setScope,
      selectChain: (chainId) => setScope(chainId === null ? EMPTY_SCOPE : chainScope(chainId)),
      clear: () => setScope(EMPTY_SCOPE),
      setRange: (label) => setParams((p) => p.set(PARAM_RANGE, label)),
      setTxKind: (kind) => setParams((p) => setOrDelete(p, PARAM_KIND, kind)),
    }),
    [setScope, setParams],
  );

  return { scope, range, txKind, hasFilter: isScoped(scope), ...actions };
}
