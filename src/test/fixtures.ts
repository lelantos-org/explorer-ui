/**
 * Row builders shared between test files.
 *
 * A fixture lives here once more than one suite needs it. Two copies of a
 * wire-shaped row drift as the type gains fields — one suite gets updated, the
 * other keeps compiling against a stale default and quietly stops covering the
 * case it was written for.
 */

import type { AnonymitySet, AssetOut, YieldAsset } from "@/api";
import type { CardMeta } from "@/ui/cardMeta";

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

/** A whole caption as one string, for assertions that only ask whether a
 *  phrase is present at all. Tier-specific claims read the field directly. */
export const captionText = (m: CardMeta): string =>
  [m.lead, m.basis, ...(m.gaps ?? [])].filter(Boolean).join(" · ");

/** What every caption reads while its data is still in flight. */
export const LOADING_TEXT = "loading…";
