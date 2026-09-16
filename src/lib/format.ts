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

/** Basis-points denominator, matching `FeeConfig.BPS_DENOMINATOR` on chain. */
const BPS_DENOMINATOR = 10_000;

/**
 * Percent form of a bps rate.
 *
 * Two decimals: the rates the pool carries are usually two digits, and this has
 * to separate 20 bps (0.2%) from 25 (0.25%) without padding every row with
 * zeroes. `Number()` trims the ones it does not need.
 */
export function fmtBps(bps: number): string {
  return fmtPercent(bps / BPS_DENOMINATOR);
}

/** Percent form of a plain fraction. Two decimals, matching `fmtBps`, so a
 *  measured share and a configured rate read on the same scale. */
export function fmtPercent(fraction: number): string {
  return `${Number((fraction * 100).toFixed(2))}%`;
}

/** A fraction as a return: "+3.42%" reads as a direction where "3.42%" reads as
 *  a rate. Signed by the same wrapper as every other directional figure. */
export const fmtGrowth = signed(fmtPercent);

/**
 * A decimal integer string, digit-grouped and otherwise untouched.
 *
 * For values that are *names* rather than magnitudes — a withdrawal
 * denomination identifies a cohort, so two that differ must not render alike.
 * `fmtCompact` collapses 100000000 and 100000512 onto the same "100.0M", which
 * puts two distinct anonymity sets on screen as what looks like one repeated
 * row.
 *
 * Grouped from the string, never via `Number`: a circuit denomination is a u256
 * and anything past 2^53 would be rounded before it reached a formatter.
 */
export function fmtDigits(value: string): string {
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  // Non-numeric input is passed through rather than mangled into groups of a
  // string that was never a number.
  if (!/^\d+$/.test(digits)) return value;
  return (negative ? "-" : "") + digits.replace(/\B(?=(\d{3})+$)/g, ",");
}

/**
 * A formatted figure, split into its digits and its magnitude letter.
 *
 * The letter is set smaller and muted so the digits carry the reading: "+$1.84"
 * is the figure, "M" is the scale it is on. A figure with no letter — anything
 * under a thousand — comes back whole.
 */
export function splitMagnitude(text: string): [digits: string, magnitude: string] {
  const m = /^(.*\d)([kMBT])$/.exec(text);
  return m?.[1] && m[2] ? [m[1], m[2]] : [text, ""];
}
