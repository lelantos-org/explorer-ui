import type { ChainFlow } from "../types";
import { bucketOf } from "./bucket";
import type { FlowRow } from "./generate";

/** Slots in the `/v1/chain-flows-24h` window, oldest first. */
const WINDOW_HOURS = 24;
const HOUR = 3600;

const zeroHours = () => new Array<number>(WINDOW_HOURS).fill(0);

/**
 * Oldest hour of the 24-hour window, anchored so the hour containing `ts` lands
 * in the last slot — as the backend anchors it. Anchoring on `ts - 86400`
 * instead spans 25 distinct hours, and the newest has nowhere to go but the last
 * slot alongside the hour before it.
 */
const windowStart = (ts: number) => bucketOf(ts, HOUR) - (WINDOW_HOURS - 1) * HOUR;

/**
 * Chains the backend scans that carry no assets and no flows, so the grid's
 * "indexed but quiet" card has something to render. Without one, the mock only
 * ever shows busy chains and the state goes unexercised until production hits
 * it.
 */
const IDLE_CHAIN_IDS = [137];

/**
 * The 24-hour per-chain summary, mirroring the backend contract: it carries
 * counts and no value. `hourlyIn` is transactions per hour;
 * `inflow`/`outflow`/`hourlyOut` are reserved and 0.
 *
 * Summing each chain's token amounts here — the previous shape — was the
 * cross-asset total `getAssetFlows` refuses to produce, and the grid drew its
 * "vol" shares off it.
 *
 * `now` is the instance's pinned clock, not a fresh read: reading the wall
 * clock here made the window advance between calls, so `nowSec` did not
 * actually pin the dataset.
 */
export function chainFlows24h(flows: FlowRow[], assetChainIds: number[], now: number): ChainFlow[] {
  const hourStart = windowStart(now);
  // Every indexed chain, quiet ones at zero: absent means "nobody indexes this
  // chain", which is not what an idle chain is.
  const chainIds = [...new Set([...assetChainIds, ...IDLE_CHAIN_IDS])];

  return (
    chainIds
      .map((chainId): ChainFlow => {
        const hourlyIn = zeroHours();
        let txCount = 0;
        for (const f of flows) {
          if (f.chainId !== chainId) continue;
          const slot = Math.floor((f.ts - hourStart) / HOUR);
          // Out-of-window rows are dropped, not clamped: a clamped slot adds a
          // foreign hour's count to an edge bucket, which reads as real
          // activity in that hour.
          if (slot < 0 || slot >= WINDOW_HOURS) continue;
          hourlyIn[slot] = (hourlyIn[slot] ?? 0) + f.txCount;
          txCount += f.txCount;
        }
        return { chainId, inflow: 0, outflow: 0, hourlyIn, hourlyOut: zeroHours(), txCount };
      })
      // Chain id breaks ties so the quiet chains keep a stable order rather
      // than shuffling between requests, as the backend orders them.
      .sort((a, b) => b.txCount - a.txCount || a.chainId - b.chainId)
  );
}
