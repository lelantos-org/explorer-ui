import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ExplorerApi } from "./types";
import { createHttpApi } from "./http";
import { createMockApi } from "./mock";

const ApiContext = createContext<ExplorerApi | null>(null);

export interface ApiProviderProps {
  api?: ExplorerApi;
  children: ReactNode;
}

function resolveDefault(): ExplorerApi {
  const useMock = import.meta.env.VITE_USE_MOCK === "1" || import.meta.env.VITE_USE_MOCK === "true";
  if (useMock) return createMockApi();
  return createHttpApi({ base: import.meta.env.VITE_API_BASE ?? "" });
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
