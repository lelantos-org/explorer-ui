/**
 * Row builders shared between test files.
 *
 * A fixture lives here once more than one suite needs it. Two copies of a
 * wire-shaped row drift as the type gains fields — one suite gets updated, the
 * other keeps compiling against a stale default and quietly stops covering the
 * case it was written for.
 */

import type {
  AnonymitySet,
  AssetOut,
  ChainFlow,
  FlowPoint,
  PoolNotes,
  TxKind,
  TxOut,
  YieldAsset,
} from "@/api";
import type { CardMeta } from "@/ui/cardMeta";

/**
 * A feed row of `kind`, carrying only the fields that kind publishes: no asset
 * or amount for a transfer, a denomination only for a withdrawal — one that
 * joins `cohortRow`'s default.
 */
export const txRow = (kind: TxKind, over: Partial<TxOut> = {}): TxOut => ({
  chainId: 1,
  txHashHex: "ab".repeat(32),
  blockNumber: 100,
  blockTs: 1_700_000_000,
  logIndex: 0,
  kind,
  assetIdU64: kind === "transfer" ? null : 1000,
  amount: kind === "transfer" ? null : "10",
  publicOut: kind === "withdraw" ? "500" : null,
  ...over,
});

/**
 * A registered asset with nothing resolved beyond its identity: no price and
 * no fees indexed yet. Override into the resolved states a test needs.
 */
export const assetRow = (over: Partial<AssetOut> = {}): AssetOut => ({
  chainId: 1,
  assetIdU64: 1000,
  tokenHex: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  scale: "1000000",
  decimals: 6,
  symbol: "USDC",
  priceUsd: null,
  priceAt: null,
  depositBps: null,
  withdrawBps: null,
  ...over,
});

/**
 * A withdrawal cohort. Fully recent by default, so a test that cares about
 * dormancy has to say so.
 */
export const cohortRow = (over: Partial<AnonymitySet> = {}): AnonymitySet => ({
  chainId: 1,
  assetIdU64: 1000,
  publicOut: "500",
  count: 42,
  recentCount: over.count ?? 42,
  firstTs: 1,
  lastTs: 2,
  ...over,
});

/**
 * A polled, healthy yield binding: up 3.42%, holding its 5% buffer exactly.
 *
 * The default is the ordinary case. Override into the states that need
 * distinguishing — `halted: true`, or `indexRay: null` with `updatedAt: null`
 * for a binding the poller has not reached.
 */
export const yieldRow = (over: Partial<YieldAsset> = {}): YieldAsset => ({
  chainId: 1,
  assetIdU64: 1,
  tokenHex: "aabbccddeeff00112233445566778899aabbccdd",
  symbol: "YLD",
  venueHex: "1122334455667788990011223344556677889900",
  bufferBps: 500,
  perfBps: 1_000,
  halted: false,
  gross: 100,
  idle: 5,
  accruedFee: 0.3,
  totalNormalized: "1000",
  accruedFeeNormalized: "3",
  indexRay: "1034200000000000000000000000",
  blockNumber: 99,
  updatedAt: 1_700_000_000,
  ...over,
});

/** A flow bucket with nothing measured: no token amounts, no dollars. */
export const flowPoint = (over: Partial<FlowPoint> & { ts: number }): FlowPoint => ({
  in: null,
  out: null,
  inUsd: null,
  outUsd: null,
  unpricedAssets: 0,
  ...over,
});

/** A chain's 24h row as the backend sends it today: counts only, with the
 *  reserved value fields at zero. Quiet unless a test gives it traffic. */
export const chainFlowRow = (over: Partial<ChainFlow> = {}): ChainFlow => ({
  chainId: 1,
  inflow: 0,
  outflow: 0,
  hourlyIn: [],
  hourlyOut: [],
  txCount: 0,
  ...over,
});

/** One chain's tree, 200 of whose 1,000 leaves are relayer fee notes. */
export const poolNotesRow = (over: Partial<PoolNotes> = {}): PoolNotes => ({
  chainId: 1,
  leaves: 1_000,
  feeNotes: 200,
  lastTs: 1_700_000_000,
  ...over,
});

/** A whole caption as one string, for assertions that only ask whether a
 *  phrase is present at all. Tier-specific claims read the field directly. */
export const captionText = (m: CardMeta): string =>
  [m.lead, m.basis, ...(m.gaps ?? [])].filter(Boolean).join(" · ");

/** What every caption reads while its data is still in flight. */
export const LOADING_TEXT = "loading…";
