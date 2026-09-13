import { type ReactNode, useMemo } from "react";
import { config } from "@/config";
import { ApiContext } from "./context";
import { createHttpApi } from "./http/client";
import { createMockApi } from "./mock";
import type { ExplorerApi } from "./types";

export interface ApiProviderProps {
  /** An explicit client, for tests and stories. Omitted, the build's own
   *  configuration decides; see `config`. */
  api?: ExplorerApi;
  children: ReactNode;
}

function resolveDefault(): ExplorerApi {
  return config.useMock ? createMockApi() : createHttpApi({ base: config.apiBase });
}

export default function ApiProvider({ api, children }: ApiProviderProps) {
  const value = useMemo(() => api ?? resolveDefault(), [api]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
