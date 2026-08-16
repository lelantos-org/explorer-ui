import type { Range } from "./ranges";

/** Inclusive time window a chart plots, in unix seconds. */
export interface TimeDomain {
  start: number;
  end: number;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** The window a range covers, anchored at the moment of the call. */
export function rangeDomain(range: Range, now = nowSec()): TimeDomain {
  return { start: now - range.sec, end: now };
}

/** Seconds a domain spans, floored at 1 so it is always safe to divide by. */
export function domainSpan(d: TimeDomain): number {
  return Math.max(1, d.end - d.start);
}
