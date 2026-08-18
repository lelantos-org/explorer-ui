import { createContext, type ReactNode, useContext, useMemo } from "react";
import { config } from "../config";
import { createHttpApi } from "./http";
import { createMockApi } from "./mock";
import type { ExplorerApi } from "./types";

const ApiContext = createContext<ExplorerApi | null>(null);

export interface ApiProviderProps {
  /** An explicit client, for tests and stories. Omitted, the build's own
   *  configuration decides; see `config`. */
  api?: ExplorerApi;
  children: ReactNode;
}

function resolveDefault(): ExplorerApi {
  return config.useMock ? createMockApi() : createHttpApi({ base: config.apiBase });
}

export function ApiProvider({ api, children }: ApiProviderProps) {
  const value = useMemo(() => api ?? resolveDefault(), [api]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ExplorerApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside <ApiProvider>");
  return ctx;
}
