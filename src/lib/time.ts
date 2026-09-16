/** Inclusive time window a chart plots, in unix seconds. */
export interface TimeDomain {
  start: number;
  end: number;
}

/** The wall clock in unix seconds. */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** Seconds a domain spans, floored at 1 so it is always safe to divide by. */
export function domainSpan(d: TimeDomain): number {
  return Math.max(1, d.end - d.start);
}

export function fmtTs(ts: number, spanSec: number): string {
  const d = new Date(ts * 1000);
  if (spanSec <= 86400 * 2) return d.toISOString().slice(11, 16);
  return d.toISOString().slice(5, 10);
}

export function fmtAge(ts: number, now = nowSec()): string {
  const d = Math.max(0, now - ts);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function fmtBucket(sec: number): string {
  if (sec >= 86400) return `${sec / 86400}d`;
  return `${sec / 3600}h`;
}
