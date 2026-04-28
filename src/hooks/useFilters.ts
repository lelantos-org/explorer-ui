import { useCallback, useState } from "react";
import { DEFAULT_RANGE_IDX, RANGES, type Range } from "../lib/ranges";

export interface Filters {
  chainId: string;
  assetIdU64: string;
  rangeIdx: number;
  range: Range;
  hasFilter: boolean;
}

export interface FilterActions {
  setChainId: (v: string) => void;
  setAssetIdU64: (v: string) => void;
  setRangeIdx: (i: number) => void;
  selectChain: (id: number | null) => void;
  selectAsset: (chainId: number, assetIdU64: number) => void;
  clear: () => void;
}

export function useFilters(): Filters & FilterActions {
  const [chainId, setChainId] = useState("");
  const [assetIdU64, setAssetIdU64] = useState("");
  const [rangeIdx, setRangeIdx] = useState(DEFAULT_RANGE_IDX);

  const selectChain = useCallback((id: number | null) => {
    setChainId(id === null ? "" : String(id));
    setAssetIdU64("");
  }, []);

  const selectAsset = useCallback((cid: number, aid: number) => {
    setChainId(String(cid));
    setAssetIdU64(String(aid));
  }, []);

  const clear = useCallback(() => {
    setChainId("");
    setAssetIdU64("");
  }, []);

  return {
    chainId,
    assetIdU64,
    rangeIdx,
    range: RANGES[rangeIdx],
    hasFilter: !!(chainId || assetIdU64),
    setChainId,
    setAssetIdU64,
    setRangeIdx,
    selectChain,
    selectAsset,
    clear,
  };
}
