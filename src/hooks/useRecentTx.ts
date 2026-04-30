import { useEffect, useState } from "react";
import { useApi } from "../api";
import type { TreeAdvanceOut } from "../types";

export function useRecentTx(limit = 20): { data: TreeAdvanceOut[] | null; loading: boolean } {
  const api = useApi();
  const [data, setData] = useState<TreeAdvanceOut[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getRecentTreeAdvances(limit)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setData([]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, limit]);

  return { data, loading };
}
