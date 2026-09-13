import { useContext } from "react";
import { ApiContext } from "./context";
import type { ExplorerApi } from "./types";

/** The backend client. Throws outside `ApiProvider`, where there is none. */
export function useApi(): ExplorerApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used inside <ApiProvider>");
  return api;
}
