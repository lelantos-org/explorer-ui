import { useApi } from "../../api";
import { useAsync } from "../../hooks/useAsync";

const HEALTH_POLL_MS = 10_000;

/** Backend reachability. `null` is "not yet known", not "down" — the two look
 *  different so a slow first response never reads as an outage. */
export default function StatusDot() {
  const api = useApi();
  const { data: up } = useAsync(() => api.health(), [api], { refetchMs: HEALTH_POLL_MS });

  const cls = up === null ? "dot dot--idle" : up ? "dot dot--ok" : "dot dot--err";
  const label = up === null ? "···" : up ? "live" : "down";

  return (
    <span className="status">
      <span className={cls} /> <span className="muted mono">{label}</span>
    </span>
  );
}
