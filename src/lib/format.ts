// Token amounts arrive as whole tokens: the backend divides each asset's base
// units by `10^decimals` — never by `scale`, which sizes a value for the circuit
// rather than normalising decimals — so a WETH figure lands at 14 and not 1.4e19,
// and the k/M/B/T ladder covers the ordinary range. The exponent branch stays as
// a guard — nothing bounds a single whale bucket, and past 1e12 the ladder stops
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

/**
 * Wrap a magnitude formatter so it always carries an explicit sign.
 *
 * The sign is prefixed here rather than left to the formatter: a net figure has
 * to read as a direction, and "+0" says the range balanced where "0" reads as
 * nothing having happened. U+2212 for the negative, so it aligns with the
 * digits rather than sitting high like a hyphen.
 */
const signed =
  (fmt: (n: number) => string) =>
  (n: number): string =>
    (n >= 0 ? "+" : "−") + fmt(Math.abs(n));

export const fmtSigned = signed(fmtNum);

// Dollars keep cents below 1k, where rounding to a whole dollar would hide the
// difference between $4.99 and $5; above that the k/M/B ladder takes over.
export function fmtUsd(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  return v < 1000 ? `${sign}$${v.toFixed(2)}` : `${sign}$${scaled(v, 2)}`;
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

export const fmtUsdSigned = signed(fmtUsd);
export const fmtTokensSigned = signed(fmtTokens);

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

/**
 * The one separator for card metadata, tile units and any other line that names
 * several facts about a figure. Absent parts drop out rather than leaving a
 * dangling separator, so callers can pass a conditional straight in.
 */
export function joinMeta(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}
