import { useNow } from "@/hooks/useNow";
import { fmtAge } from "@/lib/time";

interface Props {
  /** When the figures on screen arrived, in epoch ms; `null` before they have. */
  updatedAt: number | null;
  /** The poll interval, named so a reader knows when the next ones land. */
  pollMs: number;
}

const toSec = (ms: number) => Math.floor(ms / 1000);

/**
 * How old the figures are, and how often they are replaced.
 *
 * Its own component because it re-renders every second: the age has to tick
 * between polls, and that clock belongs to this one span rather than to the
 * page that would otherwise re-render every chart with it.
 */
export default function RefreshStamp({ updatedAt, pollMs }: Props) {
  const now = useNow();
  const age =
    updatedAt === null
      ? "not refreshed yet"
      : `Refreshed ${fmtAge(toSec(updatedAt), toSec(Math.max(now, updatedAt)))} ago`;
  return (
    <span className="filters__stamp">
      {age} · polls every {Math.round(pollMs / 1000)}s
    </span>
  );
}
