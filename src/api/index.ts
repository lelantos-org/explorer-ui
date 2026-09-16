/**
 * The API layer's entry point. Import types and clients from here rather than
 * reaching into `./http` or `./mock` — the deep paths exist for the layer's own
 * wiring, not for consumers.
 *
 * One exception: `domain/` imports `@/api/types` directly. It is the pure domain
 * layer, and going through this barrel would put the provider, the HTTP client
 * and the mock generator in the import graph of every domain rule.
 */

export { type ApiProviderProps, default as ApiProvider } from "./ApiProvider";
export { createHttpApi, type HttpApiOpts } from "./http/client";
export { createMockApi, type MockApiOpts } from "./mock";
export * from "./types";
export { useApi } from "./useApi";
