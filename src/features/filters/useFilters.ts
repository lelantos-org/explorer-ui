import { useCallback, useMemo } from "react";
import type { KindFilter } from "@/domain/kinds";
import type { RangeLabel } from "@/domain/ranges";
import { chainScope, EMPTY_SCOPE, isScoped, type Scope } from "@/domain/scope";
import { useSetUrlParams, useUrlParams } from "@/hooks/useUrlState";
import { PARAM, readFilters, setOrDelete, type UrlFilters, writeScope } from "./filterParams";

export interface Filters extends UrlFilters {
  /** Whether the page as a whole is narrowed — the scope only. The kind scopes
   *  the feed card, not the page, so it is deliberately outside this. */
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

/**
 * The page's query state, held in the URL so a filtered view can be bookmarked
 * or shared. The spelling of that URL lives in `filterParams`.
 *
 * Every action keeps a stable identity across renders, so passing them down as
 * props does not defeat memoisation in the components that receive them.
 */
export function useFilters(): FilterState {
  const params = useUrlParams();
  const setParams = useSetUrlParams();

  const filters = useMemo(() => readFilters(params), [params]);

  const setScope = useCallback((next: Scope) => setParams((p) => writeScope(p, next)), [setParams]);

  const actions = useMemo<FilterActions>(
    () => ({
      setScope,
      selectChain: (chainId) => setScope(chainId === null ? EMPTY_SCOPE : chainScope(chainId)),
      clear: () => setScope(EMPTY_SCOPE),
      setRange: (label) => setParams((p) => p.set(PARAM.range, label)),
      setTxKind: (kind) => setParams((p) => setOrDelete(p, PARAM.kind, kind)),
    }),
    [setScope, setParams],
  );

  return { ...filters, hasFilter: isScoped(filters.scope), ...actions };
}
