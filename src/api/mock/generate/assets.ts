import type { AssetOut } from "../../types";
import { cycle, hex, type Rng } from "./rng";

interface AssetProfile {
  name: string;
  /** `name` doubles as the ERC20 symbol the indexer would have read. Set this
   *  to model a token whose `symbol()` never resolved: the registry serves
   *  `null`, which is what exercises the address fallback. */
  symbolUnresolved?: boolean;
  scale: string;
  /** Whole-token USD price. `null` models a long-tail token the provider
   *  cannot price, which is what exercises the partial-coverage UI. */
  priceUsd: number | null;
  decimals: number;
  /** Protocol fee rates in bps. Omit to model an asset whose `AssetFeeSet`
   *  the indexer has not seen yet: the registry serves `null` on both legs,
   *  which is what exercises the unknown-vs-zero distinction. A `0` here is a
   *  real zero-rate leg, not an absence. */
  depositBps?: number;
  withdrawBps?: number;
  /** Daily volume baseline. */
  baseVolume: number;
  /** Variance of hourly noise (lower = stable like USDC). */
  volatility: number;
  /** Probability of a large spike per hour (whale events). */
  spikeRate: number;
  spikeMagnitude: number;
  /** Imbalance: positive = net inflow bias; negative = outflow bias. */
  bias: number;
  /** Phase offset for the diurnal pattern (regional dominance). */
  phaseHours: number;
}

const PROFILES: AssetProfile[] = [
  {
    name: "USDC",
    depositBps: 0,
    withdrawBps: 20,
    scale: "1000000",
    decimals: 6,
    priceUsd: 1.0,
    baseVolume: 4_500_000,
    volatility: 0.18,
    spikeRate: 0.012,
    spikeMagnitude: 6,
    bias: 0.05,
    phaseHours: 14,
  },
  {
    name: "WETH",
    depositBps: 0,
    withdrawBps: 20,
    scale: "1000000000000000000",
    decimals: 18,
    priceUsd: 1882.37,
    baseVolume: 2_800_000,
    volatility: 0.32,
    spikeRate: 0.02,
    spikeMagnitude: 8,
    bias: -0.08,
    phaseHours: 15,
  },
  {
    name: "DAI",
    depositBps: 0,
    withdrawBps: 0,
    scale: "1000000000000000000",
    decimals: 18,
    priceUsd: 0.9998,
    baseVolume: 900_000,
    volatility: 0.22,
    spikeRate: 0.01,
    spikeMagnitude: 5,
    bias: 0.02,
    phaseHours: 13,
  },
  {
    name: "WBTC",
    depositBps: 25,
    withdrawBps: 25,
    scale: "100000000",
    decimals: 8,
    priceUsd: 61240.5,
    baseVolume: 1_400_000,
    volatility: 0.55,
    spikeRate: 0.03,
    spikeMagnitude: 12,
    bias: 0.1,
    phaseHours: 16,
  },
  {
    name: "USDT",
    depositBps: 20,
    withdrawBps: 30,
    scale: "1000000",
    decimals: 6,
    priceUsd: 1.0002,
    baseVolume: 5_200_000,
    volatility: 0.2,
    spikeRate: 0.015,
    spikeMagnitude: 7,
    bias: 0.03,
    phaseHours: 8,
  },
  {
    name: "LINK",
    scale: "1000000000000000000",
    decimals: 18,
    priceUsd: 11.42,
    baseVolume: 380_000,
    volatility: 0.4,
    spikeRate: 0.018,
    spikeMagnitude: 6,
    bias: -0.05,
    phaseHours: 14,
  },
  {
    name: "UNI",
    scale: "1000000000000000000",
    decimals: 18,
    priceUsd: 6.13,
    baseVolume: 260_000,
    volatility: 0.45,
    spikeRate: 0.02,
    spikeMagnitude: 6,
    bias: -0.1,
    phaseHours: 15,
  },
  {
    name: "ARB",
    symbolUnresolved: true,
    scale: "1000000000000000000",
    decimals: 18,
    priceUsd: null,
    baseVolume: 540_000,
    volatility: 0.5,
    spikeRate: 0.022,
    spikeMagnitude: 7,
    bias: 0.07,
    phaseHours: 12,
  },
];

/** Which chain each profile lands on, by position. Repeats deliberately:
 *  chain 1 carries several assets, which is what the grouped picker is for. */
const CHAINS: readonly [number, ...number[]] = [1, 1, 1, 10, 42161, 8453];

/** First registry id. Ids are assigned in profile order from here. */
const ASSET_ID_BASE = 1000;

/**
 * An asset and the profile that drives its history.
 *
 * They travel together rather than as two arrays lined up by index: the flow
 * builder used to read `PROFILES[i]` for `assets[i]`, so filtering or
 * reordering the assets anywhere in between would have silently paired each
 * one with another token's volume and volatility.
 */
export interface GeneratedAsset {
  asset: AssetOut;
  profile: AssetProfile;
}

/**
 * Mock `inAmt`/`outAmt` are already whole tokens, so `priceUsd` applies to
 * them directly. Real flows arrive as base units and the backend divides by
 * the token's `decimals` first — `scale` is never the divisor.
 */
export function buildAssets(rng: Rng, now: number): GeneratedAsset[] {
  return PROFILES.map((profile, i) => ({
    profile,
    asset: {
      chainId: cycle(CHAINS, i),
      assetIdU64: ASSET_ID_BASE + i,
      tokenHex: hex(rng, 20),
      scale: profile.scale,
      decimals: profile.decimals,
      symbol: profile.symbolUnresolved ? null : profile.name,
      priceUsd: profile.priceUsd,
      priceAt: profile.priceUsd === null ? null : now,
      depositBps: profile.depositBps ?? null,
      withdrawBps: profile.withdrawBps ?? null,
    },
  }));
}
