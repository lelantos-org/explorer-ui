import { useEffect, useState } from "react";
import { useApi } from "../api";
import type { AssetOut } from "../types";

export function useAssets(): AssetOut[] | null {
  const api = useApi();
  const [assets, setAssets] = useState<AssetOut[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listAssets()
      .then((d) => alive && setAssets(d))
      .catch(() => alive && setAssets([]));
    return () => {
      alive = false;
    };
  }, [api]);

  return assets;
}
