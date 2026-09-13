import { createContext } from "react";
import type { ExplorerApi } from "./types";

/** The client every data hook reads. Provided by `ApiProvider`, read by `useApi`. */
export const ApiContext = createContext<ExplorerApi | null>(null);
