import { useEffect, useState } from "react";
import { useApi } from "../api";
import type { CountPoint, FlowPoint } from "../api/types";
import type { Range } from "../lib/ranges";

export interface TimeDomain {
  start: number;
  end: number;
}

export interface FlowAndTxState {
  flows: FlowPoint[] | null;
  counts: CountPoint[] | null;
  domain: TimeDomain | null;
  loading: boolean;
  error: string | null;
}

export interface FlowAndTxQuery {
  chainId: string;
  assetIdU64: string;
  range: Range;
}

export function useFlowAndTx(q: FlowAndTxQuery): FlowAndTxState {
  const api = useApi();
  const [flows, setFlows] = useState<FlowPoint[] | null>(null);
  const [counts, setCounts] = useState<CountPoint[] | null>(null);
  const [domain, setDomain] = useState<TimeDomain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { chainId, assetIdU64, range } = q;

  useEffect(() => {
    let alive = true;
    const now = Math.floor(Date.now() / 1000);
    const sinceTs = now - range.sec;
    const cidNum = chainId ? Number(chainId) : undefined;
    const aidNum = assetIdU64 ? Number(assetIdU64) : undefined;

    setDomain({ start: sinceTs, end: now });
    setLoading(true);
    setError(null);

    Promise.all([
      api.getAssetFlows({ chainId: cidNum, assetIdU64: aidNum, bucketSec: range.bucket, sinceTs }),
      api.getTxCounts({ chainId: cidNum, bucketSec: range.bucket, sinceTs }),
    ])
      .then(([f, c]) => {
        if (!alive) return;
        setFlows(f);
        setCounts(c);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "error"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [api, chainId, assetIdU64, range.sec, range.bucket]);

  return { flows, counts, domain, loading, error };
}
