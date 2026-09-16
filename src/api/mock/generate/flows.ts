import type { GeneratedAsset } from "./assets";
import { gauss, type Rng } from "./rng";

export const HOURS_OF_HISTORY = 90 * 24;

export interface FlowRow {
  ts: number;
  chainId: number;
  assetIdU64: number;
  inAmt: number;
  outAmt: number;
  txCount: number;
}

/** One asset's net escrowed whole tokens, and when it last moved. */
export interface AssetNet {
  net: number;
  lastTs: number;
}

/**
 * Net escrow per asset: all-time deposits minus withdrawals.
 *
 * Shared by the escrow and yield builders so a yield asset's holdings start from
 * the same number its balance would have been — the two are the same quantity
 * before the venue earns on it, and deriving them separately is how they drift.
 */
export function netByAsset(flows: FlowRow[]): Map<number, AssetNet> {
  const totals = new Map<number, AssetNet>();
  for (const f of flows) {
    const t = totals.get(f.assetIdU64) ?? { net: 0, lastTs: 0 };
    t.net += f.inAmt - f.outAmt;
    t.lastTs = Math.max(t.lastTs, f.ts);
    totals.set(f.assetIdU64, t);
  }
  return totals;
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
  generated: GeneratedAsset[],
  hours: number,
  now: number,
): FlowRow[] {
  const rows: FlowRow[] = [];
  const hourStart = Math.floor(now / 3600) * 3600;
  const startTs = hourStart - hours * 3600;

  for (const { asset, profile } of generated) {
    const hourlyBase = profile.baseVolume / 24;
    // What the escrow holds as the walk proceeds. The pool starts empty and can
    // never pay out more than has been deposited into it, so this bounds every
    // withdrawal below. Without it an asset with a negative `bias` compounds a
    // net outflow over the whole window and ends on an impossible balance —
    // which the escrow card then renders as its "indexer missed deposits"
    // alarm, firing on generated data rather than on a real gap.
    let held = 0;

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
      // Capped against the balance *before* this hour's deposits, not after: a
      // deposit has to be flushed before it can be withdrawn, so it is not cover
      // for a withdrawal in the same bucket. An outflow-biased asset therefore
      // drains toward zero and stalls there, which is the shape a draining pool
      // actually has.
      const outAmt = Math.min(Math.max(0, Math.floor(volume * (1 - imbalance))), held);
      held += inAmt - outAmt;

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
