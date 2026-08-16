/**
 * The API layer's only entry point. Import types and clients from here rather
 * than reaching into `./types`, `./http` or `./mock` — the deep paths exist
 * for the layer's own wiring, not for consumers.
 */

export { ApiProvider, useApi } from "./context";
export { createHttpApi, type HttpApiOpts } from "./http";
export { createMockApi, type MockApiOpts } from "./mock";
export * from "./types";
