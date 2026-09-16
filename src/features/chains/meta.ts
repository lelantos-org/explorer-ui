import { fmtNum } from "@/lib/format";
import { joinMeta } from "@/lib/text";
import { type CardMeta, LOADING } from "@/ui/cardMeta";
import type { ChainsSummary } from "./summary";

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
