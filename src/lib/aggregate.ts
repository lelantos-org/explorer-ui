import type { ChainFlow, CountPoint, FlowPoint } from "../api";
import { amounts, type Denom, hasAmounts } from "./denom";

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

/** Tallest single bucket in the range; null when there is nothing to compare. */
export function peakCount(counts: CountPoint[] | null): number | null {
  if (!counts || counts.length === 0) return null;
  return counts.reduce((m, p) => (p.count > m ? p.count : m), 0);
}

export interface ChainsSummary {
  chains: number;
  inflow: number;
  outflow: number;
  tx: number;
  /** False while inflow/outflow are still reserved backend fields (all zero),
   *  so callers omit them rather than render 0 as a measurement. */
  hasValues: boolean;
}

export function summarizeChains(chainFlows: ChainFlow[] | null): ChainsSummary | null {
  if (!chainFlows) return null;
  let inflow = 0;
  let outflow = 0;
  let tx = 0;
  for (const c of chainFlows) {
    inflow += c.inflow;
    outflow += c.outflow;
    tx += c.txCount;
  }
  return { chains: chainFlows.length, inflow, outflow, tx, hasValues: inflow + outflow > 0 };
}

/**
 * Each chain's share of the grid, as a percentage.
 *
 * `/v1/chain-flows-24h` documents inflow/outflow/hourlyOut as reserved and
 * currently always 0; only txCount/hourlyIn carry data. Share is of value when
 * the backend reports any, of tx count otherwise, so a card never presents 0
 * as a measurement.
 */
export function chainShares(data: ChainFlow[]): {
  hasValues: boolean;
  shareOf: (c: ChainFlow) => number;
} {
  const hasValues = data.reduce((s, c) => s + c.inflow + c.outflow, 0) > 0;
  const weight = (c: ChainFlow) => (hasValues ? c.inflow + c.outflow : c.txCount);
  const total = data.reduce((s, c) => s + weight(c), 0);
  return {
    hasValues,
    shareOf: (c) => (total > 0 ? (weight(c) / total) * 100 : 0),
  };
}
