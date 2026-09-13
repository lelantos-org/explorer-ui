import type { ChainsSummary } from "@/lib/aggregate";
import { fmtNum, joinMeta } from "@/lib/format";
import { type CardMeta, LOADING } from "@/ui/cardMeta";

export function chainsMeta(summary: ChainsSummary | null): CardMeta {
  if (!summary) return LOADING;
  // inflow/outflow are reserved backend fields, still zero today — omit them
  // rather than render 0 as a measurement.
  const { chains, hasValues, inflow, outflow, tx } = summary;
  return {
    lead: joinMeta([
      `${chains} chains`,
      hasValues && `in ${fmtNum(inflow)}`,
      hasValues && `out ${fmtNum(outflow)}`,
      `${fmtNum(tx)} tx`,
    ]),
  };
}
