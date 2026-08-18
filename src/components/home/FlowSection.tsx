import type { FlowPoint } from "../../api";
import { type Denom, hasAmounts } from "../../lib/denom";
import type { TimeDomain } from "../../lib/time";
import ChartEmpty from "../charts/ChartEmpty";
import FlowChart from "../charts/FlowChart";

interface Props {
  flows: FlowPoint[] | null;
  denom: Denom;
  domain: TimeDomain | null;
  loading: boolean;
}

/**
 * The flow plot, or the reason there isn't one.
 *
 * Two distinct empty states: nothing happened in the range, versus several
 * assets whose amounts share no unit — a curve for the second would be a sum of
 * unlike token amounts, so it says that instead of drawing one.
 */
export default function FlowSection({ flows, denom, domain, loading }: Props) {
  const settled = flows !== null && !loading;

  if (settled && flows.length === 0) {
    return <ChartEmpty>no flow data for this range</ChartEmpty>;
  }
  if (flows !== null && flows.length > 0 && !hasAmounts(denom)) {
    return (
      <ChartEmpty>
        no comparable unit across these assets — pick a single asset above, or wait for price data
      </ChartEmpty>
    );
  }
  return <FlowChart data={flows ?? []} denom={denom} domain={domain} />;
}
