import { useMemo } from "react";
import { RANGES, type Range, rangeIndexOf } from "../lib/ranges";
import { decodeScope, EMPTY_SCOPE, encodeScope, type Scope } from "../lib/scope";
import { setOrDelete, useSetUrlParams, useUrlParams } from "./useUrlState";

export interface Filters {
  chainId: string;
  assetIdU64: string;
  /** The chain+asset selection as one value; see `lib/scope`. */
  scope: string;
  rangeIdx: number;
  range: Range;
  hasFilter: boolean;
}

export interface FilterActions {
  setScope: (v: string) => void;
  setRangeIdx: (i: number) => void;
  selectChain: (id: number | null) => void;
  selectAsset: (chainId: number, assetIdU64: number) => void;
  clear: () => void;
}

const PARAM_CHAIN = "chain";
const PARAM_ASSET = "asset";
const PARAM_RANGE = "range";

/** Ids are digits on the wire, so a hand-edited `?chain=abc` is dropped rather
 *  than sent on to the API as `NaN`. */
function idParam(v: string | null): string {
  return v && /^\d+$/.test(v) ? v : "";
}

/**
 * The page's query state, held in the URL so a filtered view can be bookmarked
 * or shared.
 */
export function useFilters(): Filters & FilterActions {
  const params = useUrlParams();
  const setParams = useSetUrlParams();

  const scope = useMemo<Scope>(() => {
    const chainId = idParam(params.get(PARAM_CHAIN));
    // An asset id is only unique within its chain, so it cannot outlive one.
    return chainId ? { chainId, assetIdU64: idParam(params.get(PARAM_ASSET)) } : EMPTY_SCOPE;
  }, [params]);

  const rangeIdx = rangeIndexOf(params.get(PARAM_RANGE));

  const writeScope = (next: Scope) =>
    setParams((p) => {
      setOrDelete(p, PARAM_CHAIN, next.chainId);
      setOrDelete(p, PARAM_ASSET, next.chainId ? next.assetIdU64 : "");
    });

  return {
    chainId: scope.chainId,
    assetIdU64: scope.assetIdU64,
    scope: encodeScope(scope),
    rangeIdx,
    range: RANGES[rangeIdx],
    hasFilter: !!scope.chainId,

    setScope: (v) => writeScope(decodeScope(v)),
    selectChain: (id) =>
      writeScope(id === null ? EMPTY_SCOPE : { chainId: String(id), assetIdU64: "" }),
    selectAsset: (chainId, assetIdU64) =>
      writeScope({ chainId: String(chainId), assetIdU64: String(assetIdU64) }),
    clear: () => writeScope(EMPTY_SCOPE),
    setRangeIdx: (i) => setParams((p) => p.set(PARAM_RANGE, RANGES[i].label)),
  };
}
