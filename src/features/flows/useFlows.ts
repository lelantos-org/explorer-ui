import { type FlowAndTx, useFlowAndTx } from "@/data/queries";
import type { Async } from "@/data/useAsync";
import { type Denom, pickDenom } from "@/domain/denom";
import type { Range } from "@/domain/ranges";
import type { Scope } from "@/domain/scope";
import { type FlowTotals, sumCounts, sumFlows } from "./totals";

export interface Flows {
  /** The request itself: its loading and error state, and when it last landed. */
  query: Async<FlowAndTx>;
  flows: FlowAndTx["flows"] | null;
  domain: FlowAndTx["domain"] | null;
  /** The range and scope the figures on screen cover — the requested ones
   *  until the first response, then whatever the last response was for. */
  range: Range;
  scope: Scope;
  /** New filters are loading over the previous figures. */
  stale: boolean;
  /** The one unit every flow figure on the page is expressed in. */
  denom: Denom;
  /** Inflow, outflow and net over the range; `null` without a common unit. */
  totals: FlowTotals | null;
  /** Commitments added over the range; `null` until the counts arrive. */
  commitments: number | null;
}

/**
 * The scoped flow series and everything derived from them.
 *
 * One denomination for the whole range, decided here once, so the masthead, the
 * tiles and the chart can never disagree about what their numbers mean.
 */
export function useFlows(scope: Scope, range: Range): Flows {
  const query = useFlowAndTx(scope, range);
  const { flows = null, counts = null, domain = null } = query.data ?? {};
  const denom = pickDenom(flows);
  return {
    query,
    flows,
    domain,
    range: query.data?.range ?? range,
    scope: query.data?.scope ?? scope,
    stale: query.loading && query.data !== null,
    denom,
    totals: sumFlows(flows, denom),
    commitments: sumCounts(counts),
  };
}
