import { useEffect, useState } from "react";

/**
 * The wall clock in epoch ms, re-read every `intervalMs`.
 *
 * For a label that has to age between renders — "refreshed 12s ago". Keep the
 * component that calls it small: everything it renders re-renders on the tick.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
