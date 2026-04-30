export function fmtNum(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e9) return sign + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return sign + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return sign + (v / 1e3).toFixed(1) + "k";
  return sign + v.toFixed(0);
}

export function fmtCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e9) return sign + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return sign + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return sign + (v / 1e3).toFixed(1) + "k";
  return sign + v.toFixed(0);
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtNum(Math.abs(n));
}

export function fmtTs(ts: number, spanSec: number): string {
  const d = new Date(ts * 1000);
  if (spanSec <= 86400 * 2) return d.toISOString().slice(11, 16);
  return d.toISOString().slice(5, 10);
}

export function fmtAge(ts: number, now = Math.floor(Date.now() / 1000)): string {
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
