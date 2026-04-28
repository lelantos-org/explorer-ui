import { useEffect, useState } from "react";
import { useApi } from "../api";
import type { ChainFlow } from "../api/types";

export function useChainFlows24h(): ChainFlow[] | null {
  const api = useApi();
  const [data, setData] = useState<ChainFlow[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getChainFlows24h()
      .then((d) => alive && setData(d))
      .catch(() => alive && setData([]));
    return () => {
      alive = false;
    };
  }, [api]);

  return data;
}
