/**
 * Synthetic history for the mock backend.
 *
 * Everything here is pure given an `Rng`, so a seed reproduces the whole
 * dataset exactly. Nothing in this file knows about the `ExplorerApi` surface —
 * it only produces the rows `./index.ts` queries over.
 */
import type { AssetOut } from "../types";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(rng: Rng, bytes: number): string {
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += Math.floor(rng() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return s;
}

/** Box-Muller gaussian, mean 0 std 1. */
function gauss(rng: Rng): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const HOURS_OF_HISTORY = 90 * 24;

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

const CHAINS = [1, 1, 1, 10, 42161, 8453];

/**
 * Mock `inAmt`/`outAmt` are already whole tokens, so `priceUsd` applies to
 * them directly. Real flows arrive as base units and the backend divides by
 * the token's `decimals` first — `scale` is never the divisor.
 */
export function buildAssets(rng: Rng, now: number): AssetOut[] {
  return PROFILES.map((p, i) => ({
    chainId: CHAINS[i % CHAINS.length],
    assetIdU64: 1000 + i,
    tokenHex: hex(rng, 20),
    scale: p.scale,
    decimals: p.decimals,
    symbol: p.symbolUnresolved ? null : p.name,
    priceUsd: p.priceUsd,
    priceAt: p.priceUsd === null ? null : now,
  }));
}

export interface FlowRow {
  ts: number;
  chainId: number;
  assetIdU64: number;
  inAmt: number;
  outAmt: number;
  txCount: number;
}

/** Load multiplier in [~0.2, ~2.0] for an absolute hour-of-epoch. */
function loadCurve(absHour: number, phaseHours: number): number {
  const hourOfDay = ((absHour % 24) + 24) % 24;
  const diurnal = 0.5 + 0.5 * Math.sin(((hourOfDay - phaseHours) / 24) * 2 * Math.PI);
  const weekly = 0.5 + 0.5 * Math.cos(((absHour % 168) / 168) * 2 * Math.PI);
  // Weekend dip (Sat=5, Sun=6 of a week starting Mon=0).
  const dow = Math.floor((absHour / 24) % 7);
  const weekendFactor = dow >= 5 ? 0.65 : 1.0;
  return (0.35 + diurnal * 0.9 + weekly * 0.25) * weekendFactor;
}

export function buildHourlyFlows(
  rng: Rng,
  assets: AssetOut[],
  hours: number,
  now: number,
): FlowRow[] {
  const rows: FlowRow[] = [];
  const hourStart = Math.floor(now / 3600) * 3600;
  const startTs = hourStart - hours * 3600;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const profile = PROFILES[i];
    const hourlyBase = profile.baseVolume / 24;

    for (let h = 0; h < hours; h++) {
      const ts = startTs + h * 3600;
      const absHour = Math.floor(ts / 3600);

      // Long-term linear growth: 0.7 → 1.4 over the window.
      const trend = 0.7 + (h / hours) * 0.7;
      const load = loadCurve(absHour, profile.phaseHours);
      const noise = Math.exp(gauss(rng) * profile.volatility);

      let mult = trend * load * noise;
      if (rng() < profile.spikeRate) {
        mult *= profile.spikeMagnitude * (0.5 + rng());
      }

      const volume = Math.max(0, hourlyBase * mult);
      const imbalance = profile.bias + gauss(rng) * 0.08;
      const inAmt = Math.max(0, Math.floor(volume * (1 + imbalance)));
      const outAmt = Math.max(0, Math.floor(volume * (1 - imbalance)));

      // Tx count scales with volume but compressed (sqrt-ish).
      const intensity = Math.sqrt(mult);
      const txCount = Math.max(0, Math.round(2 + intensity * (3 + rng() * 4)));

      rows.push({
        ts,
        chainId: asset.chainId,
        assetIdU64: asset.assetIdU64,
        inAmt,
        outAmt,
        txCount,
      });
    }
  }
  return rows;
}

/**
 * A merkle tree insertion event.
 *
 * Mock-internal: the UI reads the classified `getRecentTransactions` feed, not
 * raw advances, so this type never crosses the `ExplorerApi` boundary. The mock
 * still synthesises them because the feed is derived from them, the same way
 * the real backend derives it.
 */
export interface TreeAdvance {
  chainId: number;
  blockNumber: number;
  logIndex: number;
  startIndex: number;
  inserted: number;
  oldRootHex: string;
  newRootHex: string;
  txHashHex: string;
  blockTs: number;
}

export function buildTreeAdvances(rng: Rng, flows: FlowRow[]): TreeAdvance[] {
  // Group by hourly bucket, total tx per chain per hour.
  const byHour = new Map<string, { ts: number; chainId: number; tx: number }>();
  for (const f of flows) {
    const key = `${f.chainId}:${f.ts}`;
    const cur = byHour.get(key);
    if (cur) cur.tx += f.txCount;
    else byHour.set(key, { ts: f.ts, chainId: f.chainId, tx: f.txCount });
  }

  const buckets = [...byHour.values()].sort((a, b) => a.ts - b.ts);

  const out: TreeAdvance[] = [];
  const startIndexByChain = new Map<number, number>();
  const blockByChain = new Map<number, number>();
  const rootByChain = new Map<number, string>();

  for (const b of buckets) {
    if (b.tx === 0) continue;
    // Split tx into 2-6 log entries per hour for that chain.
    const entries = 2 + Math.floor(rng() * 5);
    let remaining = b.tx;
    let block = blockByChain.get(b.chainId) ?? 19_500_000 + b.chainId * 1000;
    let startIndex = startIndexByChain.get(b.chainId) ?? 0;
    let prevRoot = rootByChain.get(b.chainId) ?? hex(rng, 32);

    for (let e = 0; e < entries && remaining > 0; e++) {
      const isLast = e === entries - 1;
      const inserted = isLast ? remaining : Math.max(1, Math.floor(remaining / (entries - e)));
      remaining -= inserted;
      const newRoot = hex(rng, 32);
      out.push({
        chainId: b.chainId,
        blockNumber: block,
        logIndex: e,
        startIndex,
        inserted,
        oldRootHex: prevRoot,
        newRootHex: newRoot,
        txHashHex: hex(rng, 32),
        blockTs: b.ts + Math.floor((e * 3600) / entries) + Math.floor(rng() * 60),
      });
      prevRoot = newRoot;
      startIndex += inserted;
      block += 1 + Math.floor(rng() * 30);
    }

    blockByChain.set(b.chainId, block);
    startIndexByChain.set(b.chainId, startIndex);
    rootByChain.set(b.chainId, prevRoot);
  }

  return out.sort((a, b) => a.blockTs - b.blockTs);
}
