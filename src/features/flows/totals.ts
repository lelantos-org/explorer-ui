import type { CountPoint, FlowPoint } from "@/api";
import { amounts, type Denom, hasAmounts } from "@/domain/denom";

export interface FlowTotals {
  inflow: number;
  outflow: number;
  net: number;
}

/**
 * Sum a range's buckets into one figure per direction.
 *
 * null when there is no common unit. Summing anyway is exactly how this card
 * came to report 3.10B for what was 31 tokens across three assets — the
 * denomination decides whether a total exists at all, not just how to print it.
 */
export function sumFlows(flows: FlowPoint[] | null, denom: Denom): FlowTotals | null {
  if (!flows || !hasAmounts(denom)) return null;
  let inflow = 0;
  let outflow = 0;
  for (const p of flows) {
    const v = amounts(p, denom);
    inflow += v.in;
    outflow += v.out;
  }
  return { inflow, outflow, net: inflow - outflow };
}

export function sumCounts(counts: CountPoint[] | null): number | null {
  if (!counts) return null;
  return counts.reduce((s, p) => s + p.count, 0);
}
