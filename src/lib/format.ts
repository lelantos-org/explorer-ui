// Token amounts arrive as circuit units: the backend divides each asset's base
// units by its `scale`, so a WETH-scale figure no longer lands at 1e19 and the
// k/M/B/T ladder covers the ordinary range. The exponent branch stays as a
// guard — nothing bounds a single whale bucket, and past 1e12 the ladder stops
// being readable rather than growing the mantissa without bound.
function scaled(n: number, digits: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e15) return `${sign}${v.toExponential(2).replace("e+", "e")}`;
  if (v >= 1e12) return `${sign}${(v / 1e12).toFixed(digits)}T`;
  if (v >= 1e9) return `${sign}${(v / 1e9).toFixed(digits)}B`;
  if (v >= 1e6) return `${sign}${(v / 1e6).toFixed(digits)}M`;
  if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(1)}k`;
  return `${sign}${v.toFixed(0)}`;
}

export function fmtNum(n: number): string {
  return scaled(n, 2);
}

export function fmtCompact(n: number): string {
  return scaled(n, 1);
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtNum(Math.abs(n));
}

// Dollars keep cents below 1k, where rounding to a whole dollar would hide the
// difference between $4.99 and $5; above that the k/M/B ladder takes over.
export function fmtUsd(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  return v < 1000 ? `${sign}$${v.toFixed(2)}` : `${sign}$${scaled(v, 2)}`;
}

export function fmtUsdSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtUsd(Math.abs(n));
}

// Token amounts are whole tokens, so they are usually small — 14 WETH, 1.5
// mWBTC. The k/M/B ladder rounds to whole units below 1000, which would print
// 1.5 as "2" and 0.0125 as "0"; keep real decimals in that range instead.
export function fmtTokens(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  if (v === 0) return "0";
  if (v >= 1000) return sign + scaled(v, 2);
  return sign + Number(v.toFixed(v >= 1 ? 4 : 8)).toString();
}

export function fmtTokensSigned(n: number): string {
  return (n >= 0 ? "+" : "−") + fmtTokens(Math.abs(n));
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
