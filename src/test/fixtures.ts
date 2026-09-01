/**
 * Row builders shared between test files.
 *
 * A fixture lives here once more than one suite needs it. Two copies of a
 * wire-shaped row drift as the type gains fields — one suite gets updated, the
 * other keeps compiling against a stale default and quietly stops covering the
 * case it was written for.
 */

import type { YieldAsset } from "../api";

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
