import type { AssetOut, TreeAdvanceOut } from "../types";
import type {
  ChainFlow,
  CountPoint,
  CountQuery,
  ExplorerApi,
  FlowPoint,
  FlowQuery,
  ListTreeAdvancesOpts,
} from "./types";

export interface MockApiOpts {
  latencyMs?: number;
  failureRate?: number;
  seed?: number;
  healthy?: boolean;
}

const HOURS_OF_HISTORY = 90 * 24;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(rng: () => number, bytes: number): string {
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += Math.floor(rng() * 256).toString(16).padStart(2, "0");
  }
  return s;
}

// Box-Muller gaussian, mean 0 std 1.
function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface AssetProfile {
  name: string;
  scale: string;
  // Daily volume baseline.
  baseVolume: number;
  // Variance of hourly noise (lower = stable like USDC).
  volatility: number;
  // Probability of large spike per hour (whale events).
  spikeRate: number;
  spikeMagnitude: number;
  // Imbalance: positive = net inflow bias; negative = outflow bias.
  bias: number;
  // Phase offset for diurnal pattern (regional dominance).
  phaseHours: number;
}

const PROFILES: AssetProfile[] = [
  { name: "USDC", scale: "1000000", baseVolume: 4_500_000, volatility: 0.18, spikeRate: 0.012, spikeMagnitude: 6, bias: 0.05, phaseHours: 14 },
  { name: "WETH", scale: "1000000000000000000", baseVolume: 2_800_000, volatility: 0.32, spikeRate: 0.020, spikeMagnitude: 8, bias: -0.08, phaseHours: 15 },
  { name: "DAI", scale: "1000000000000000000", baseVolume: 900_000, volatility: 0.22, spikeRate: 0.010, spikeMagnitude: 5, bias: 0.02, phaseHours: 13 },
  { name: "WBTC", scale: "100000000", baseVolume: 1_400_000, volatility: 0.55, spikeRate: 0.030, spikeMagnitude: 12, bias: 0.10, phaseHours: 16 },
  { name: "USDT", scale: "1000000", baseVolume: 5_200_000, volatility: 0.20, spikeRate: 0.015, spikeMagnitude: 7, bias: 0.03, phaseHours: 8 },
  { name: "LINK", scale: "1000000000000000000", baseVolume: 380_000, volatility: 0.40, spikeRate: 0.018, spikeMagnitude: 6, bias: -0.05, phaseHours: 14 },
  { name: "UNI", scale: "1000000000000000000", baseVolume: 260_000, volatility: 0.45, spikeRate: 0.020, spikeMagnitude: 6, bias: -0.10, phaseHours: 15 },
  { name: "ARB", scale: "1000000000000000000", baseVolume: 540_000, volatility: 0.50, spikeRate: 0.022, spikeMagnitude: 7, bias: 0.07, phaseHours: 12 },
];

const CHAINS = [1, 1, 1, 10, 42161, 8453];

function buildAssets(rng: () => number): AssetOut[] {
  return PROFILES.map((p, i) => ({
    chain_id: CHAINS[i % CHAINS.length],
    asset_id_u64: 1000 + i,
    token_hex: hex(rng, 20),
    scale: p.scale,
    gen_x: hex(rng, 32),
    gen_y: hex(rng, 32),
  }));
}

interface FlowRow {
  ts: number;
  chain_id: number;
  asset_id_u64: number;
  inAmt: number;
  outAmt: number;
  txCount: number;
}

// Returns load multiplier in [~0.2, ~2.0] for absolute hour-of-epoch.
function loadCurve(absHour: number, phaseHours: number): number {
  const hourOfDay = ((absHour % 24) + 24) % 24;
  const diurnal = 0.5 + 0.5 * Math.sin(((hourOfDay - phaseHours) / 24) * 2 * Math.PI);
  const weekly = 0.5 + 0.5 * Math.cos(((absHour % 168) / 168) * 2 * Math.PI);
  // Weekend dip (Sat=5,Sun=6 of week starting Mon=0).
  const dow = Math.floor((absHour / 24) % 7);
  const weekendFactor = dow >= 5 ? 0.65 : 1.0;
  return (0.35 + diurnal * 0.9 + weekly * 0.25) * weekendFactor;
}

function buildHourlyFlows(rng: () => number, assets: AssetOut[], hours: number): FlowRow[] {
  const rows: FlowRow[] = [];
  const now = Math.floor(Date.now() / 1000);
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
        chain_id: asset.chain_id,
        asset_id_u64: asset.asset_id_u64,
        inAmt,
        outAmt,
        txCount,
      });
    }
  }
  return rows;
}

function buildTreeAdvancesFromFlows(rng: () => number, flows: FlowRow[]): TreeAdvanceOut[] {
  // Group by hourly bucket, total tx per chain per hour.
  const byHour = new Map<string, { ts: number; chain_id: number; tx: number }>();
  for (const f of flows) {
    const key = `${f.chain_id}:${f.ts}`;
    const cur = byHour.get(key);
    if (cur) cur.tx += f.txCount;
    else byHour.set(key, { ts: f.ts, chain_id: f.chain_id, tx: f.txCount });
  }

  const buckets = [...byHour.values()].sort((a, b) => a.ts - b.ts);

  const out: TreeAdvanceOut[] = [];
  const startIndexByChain = new Map<number, number>();
  const blockByChain = new Map<number, number>();
  const rootByChain = new Map<number, string>();

  for (const b of buckets) {
    if (b.tx === 0) continue;
    // Split tx into 2-6 log entries per hour for that chain.
    const entries = 2 + Math.floor(rng() * 5);
    let remaining = b.tx;
    let block = blockByChain.get(b.chain_id) ?? 19_500_000 + b.chain_id * 1000;
    let startIndex = startIndexByChain.get(b.chain_id) ?? 0;
    let prevRoot = rootByChain.get(b.chain_id) ?? hex(rng, 32);

    for (let e = 0; e < entries && remaining > 0; e++) {
      const isLast = e === entries - 1;
      const inserted = isLast ? remaining : Math.max(1, Math.floor(remaining / (entries - e)));
      remaining -= inserted;
      const newRoot = hex(rng, 32);
      const ts = b.ts + Math.floor((e * 3600) / entries) + Math.floor(rng() * 60);
      out.push({
        chain_id: b.chain_id,
        block_number: block,
        log_index: e,
        start_index: startIndex,
        inserted,
        old_root_hex: prevRoot,
        new_root_hex: newRoot,
        tx_hash_hex: hex(rng, 32),
        block_ts: ts,
      });
      prevRoot = newRoot;
      startIndex += inserted;
      block += 1 + Math.floor(rng() * 30);
    }

    blockByChain.set(b.chain_id, block);
    startIndexByChain.set(b.chain_id, startIndex);
    rootByChain.set(b.chain_id, prevRoot);
  }

  return out.sort((a, b) => a.block_ts - b.block_ts);
}

export function createMockApi(opts: MockApiOpts = {}): ExplorerApi {
  const latency = opts.latencyMs ?? 200;
  const failureRate = opts.failureRate ?? 0;
  const healthy = opts.healthy ?? true;
  const rng = mulberry32(opts.seed ?? 0xdeadbeef);

  const assets = buildAssets(rng);
  const flows = buildHourlyFlows(rng, assets, HOURS_OF_HISTORY);
  const advances = buildTreeAdvancesFromFlows(rng, flows);

  const wait = () => new Promise<void>((r) => setTimeout(r, latency));
  const maybeFail = () => {
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new Error("503 mock: simulated failure");
    }
  };

  return {
    async health() {
      await wait();
      return healthy;
    },

    async listAssets(chainId?: number) {
      await wait();
      maybeFail();
      const filtered = chainId === undefined ? assets : assets.filter((a) => a.chain_id === chainId);
      return filtered.map((a) => ({ ...a }));
    },

    async listTreeAdvances(o: ListTreeAdvancesOpts) {
      await wait();
      maybeFail();
      let rows = advances;
      if (o.chainId !== undefined) rows = rows.filter((r) => r.chain_id === o.chainId);
      if (o.sinceStartIndex !== undefined) {
        const since = o.sinceStartIndex;
        rows = rows.filter((r) => r.start_index > since);
      }
      const limit = Math.min(o.limit ?? 100, 1000);
      return rows.slice(0, limit).map((r) => ({ ...r }));
    },

    async getAssetFlows(q: FlowQuery): Promise<FlowPoint[]> {
      await wait();
      maybeFail();
      const bucket = q.bucketSec ?? 86400;
      let rows = flows;
      if (q.chainId !== undefined) rows = rows.filter((r) => r.chain_id === q.chainId);
      if (q.assetIdU64 !== undefined) rows = rows.filter((r) => r.asset_id_u64 === q.assetIdU64);
      if (q.sinceTs !== undefined) rows = rows.filter((r) => r.ts >= q.sinceTs!);
      const map = new Map<number, { in: number; out: number }>();
      for (const r of rows) {
        const k = Math.floor(r.ts / bucket) * bucket;
        const cur = map.get(k);
        if (cur) {
          cur.in += r.inAmt;
          cur.out += r.outAmt;
        } else {
          map.set(k, { in: r.inAmt, out: r.outAmt });
        }
      }
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ts, v]) => ({ ts, in: v.in, out: v.out }));
    },

    async getChainFlows24h(): Promise<ChainFlow[]> {
      await wait();
      maybeFail();
      const now = Math.floor(Date.now() / 1000);
      const sinceTs = now - 86400;
      const hourStart = Math.floor(sinceTs / 3600) * 3600;

      const chainIds = [...new Set(assets.map((a) => a.chain_id))];
      const result: ChainFlow[] = chainIds.map((cid) => {
        const hourlyIn = new Array(24).fill(0);
        const hourlyOut = new Array(24).fill(0);
        let txCount = 0;

        for (const f of flows) {
          if (f.chain_id !== cid) continue;
          if (f.ts < hourStart) continue;
          const slot = Math.max(0, Math.min(23, Math.floor((f.ts - hourStart) / 3600)));
          hourlyIn[slot] += f.inAmt;
          hourlyOut[slot] += f.outAmt;
          txCount += f.txCount;
        }

        const inflow = hourlyIn.reduce((s, v) => s + v, 0);
        const outflow = hourlyOut.reduce((s, v) => s + v, 0);
        return { chainId: cid, inflow, outflow, hourlyIn, hourlyOut, txCount };
      });
      return result.sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));
    },

    async getTxCounts(q: CountQuery): Promise<CountPoint[]> {
      await wait();
      maybeFail();
      const bucket = q.bucketSec ?? 3600;
      let rows = flows;
      if (q.chainId !== undefined) rows = rows.filter((r) => r.chain_id === q.chainId);
      if (q.sinceTs !== undefined) rows = rows.filter((r) => r.ts >= q.sinceTs!);
      const map = new Map<number, number>();
      for (const r of rows) {
        const k = Math.floor(r.ts / bucket) * bucket;
        map.set(k, (map.get(k) ?? 0) + r.txCount);
      }
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([ts, count]) => ({ ts, count }));
    },
  };
}
