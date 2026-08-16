# Lelantos Explorer

A browser-based explorer for public MASP (Multi-Asset Shielded Pool) chain data. It charts deposit and withdraw flows, transaction counts and kinds, per-chain activity, and a live transaction feed, filtered by chain, asset, and time range.

Only public data is served: the explorer reads the [`explorer-webserver`](../backend/crates/explorer-webserver) API, which is barred from depending on `fmd-crypto` by a CI gate.

## Tech Stack

- [React 18](https://react.dev/) with TypeScript, bundled by [Vite](https://vite.dev/)
- Hand-rolled SVG charts — no charting dependency
- [Biome](https://biomejs.dev/) for linting and formatting, [Vitest](https://vitest.dev/) for testing

## Prerequisites

- Node.js 20+ (Vite and Vitest require `^18 || >=20`)
- A running `explorer-webserver` when developing against live data, or `VITE_USE_MOCK=1` to run without a backend

## Getting Started

```bash
npm ci
cp .env.example .env
npm run dev
```

The dev server listens on port `5175` (webapp-ui uses `5174`).

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_TARGET` | No | `http://localhost:3002` | Backend the dev-server proxy forwards to |
| `VITE_API_BASE` | No | `""` | API base prefix used by the browser; empty means same-origin via the proxy |
| `VITE_USE_MOCK` | No | `0` | `1` or `true` serves a generated dataset instead of the API |

`VITE_USE_MOCK` selects the API implementation at startup in [`src/api/context.tsx`](src/api/context.tsx). The mock generates a seeded 90-day dataset, so the UI can be developed and demoed with no backend running.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run the TypeScript compiler without emitting |
| `npm run lint` | Lint with Biome |
| `npm run format` | Format with Biome |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |

## Development

### Service proxy

The dev server proxies API paths to the backend, so the default empty `VITE_API_BASE` works without CORS configuration:

| Path | Target |
| --- | --- |
| `/v1` | `VITE_API_TARGET` (default `http://localhost:3002`) |
| `/health` | `VITE_API_TARGET` (default `http://localhost:3002`) |

### API surface

The [`ExplorerApi`](src/api/types.ts) port is implemented twice — over HTTP and by the mock — so every screen has a backend-free path. It covers:

| Endpoint | Purpose |
| --- | --- |
| `/health` | Liveness, polled by the header status dot |
| `/v1/assets` | Registered assets, grouped per chain by the scope picker |
| `/v1/chain-flows-24h` | Per-chain 24-hour activity |
| `/v1/asset-flows` | Bucketed deposit/withdraw flows |
| `/v1/tx-counts` | Bucketed transaction counts |
| `/v1/tx-kinds` | Transaction counts split by kind |
| `/v1/transactions` | Newest-first classified feed |

Amounts cross the wire as decimal strings: token base units exceed the safe range of a JSON number.

### Filter state

Chain, asset, and range live in the URL query (`?chain=&asset=&range=`), so a filtered view can be bookmarked and shared. Chain and asset are one selection rather than two controls — an `assetIdU64` is unique only within its chain, so it is never addressable without one. See [`src/lib/scope.ts`](src/lib/scope.ts) and [`src/hooks/useFilters.ts`](src/hooks/useFilters.ts).

## Testing

```bash
npm run test
```

Vitest runs in a `node` environment — the suite covers the pure modules (formatting, denomination, aggregation, chart geometry, the mock backend) plus a server-render smoke test over the real component tree, none of which need a DOM.
