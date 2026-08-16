import type { FlowPoint } from "../../api";
import { type Denom, hasAmounts } from "../../lib/denom";
import type { TimeDomain } from "../../lib/time";
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
  if (flows && flows.length === 0 && !loading) {
    return <div className="empty">no flow data for this range</div>;
  }
  if (flows && flows.length > 0 && !hasAmounts(denom)) {
    return (
      <div className="empty">
        no comparable unit across these assets — pick a single asset above, or wait for price data
      </div>
    );
  }
  return <FlowChart data={flows ?? []} denom={denom} domain={domain} />;
}
