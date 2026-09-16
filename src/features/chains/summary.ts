import type { ChainFlow } from "@/api";

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
