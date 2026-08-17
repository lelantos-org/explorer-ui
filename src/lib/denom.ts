import type { FlowPoint } from "../api";
import {
  fmtNum,
  fmtSigned,
  fmtTokens,
  fmtTokensSigned,
  fmtUsd,
  fmtUsdSigned,
  joinMeta,
} from "./format";

/**
 * Which unit the flow widgets can honestly speak.
 *
 * - `tokens`      — exactly one asset is in scope, so amounts are whole tokens
 *                   of that token. Exact, and the most concrete view.
 * - `usd`         — every bucket priced, every asset in every bucket priced.
 * - `usd-partial` — every bucket has some priced volume, but at least one asset
 *                   has no price, so dollar totals are a floor.
 * - `none`        — several assets in scope and no usable prices. There is no
 *                   valid figure to show, and inventing one is how this screen
 *                   came to report 3.10B for 31 tokens.
 */
export type Denom = "tokens" | "usd" | "usd-partial" | "none";

const has = (v: number | null | undefined): v is number => v != null;

/**
 * Pick the denomination for a range.
 *
 * Token amounts win when available, because the backend only emits them when a
 * single asset is in scope — "14" of one token beats "$26.4k" of it. With
 * several assets there is no token total at all (amounts of different tokens
 * are not addable in any unit), so USD is the only candidate, and it needs
 * *every* bucket priced: a range where some buckets priced and others did not
 * would have to plot the rest as $0, and a fabricated zero reads as "no
 * activity".
 *
 * `== null` throughout, not `=== null`: a backend older than these fields omits
 * them, and `undefined !== null` would sail past a strict check.
 */
export function pickDenom(flows: FlowPoint[] | null): Denom {
  if (!flows || flows.length === 0) return "none";
  if (flows.every((p) => has(p.in) && has(p.out))) return "tokens";
  if (flows.every((p) => has(p.inUsd) && has(p.outUsd))) {
    return flows.some((p) => p.unpricedAssets > 0) ? "usd-partial" : "usd";
  }
  return "none";
}

export function isUsd(d: Denom): boolean {
  return d === "usd" || d === "usd-partial";
}

/** Whether there is any figure worth rendering. */
export function hasAmounts(d: Denom): boolean {
  return d !== "none";
}

/** Amount formatter matching the denomination. */
export function amountFmt(d: Denom): (n: number) => string {
  if (isUsd(d)) return fmtUsd;
  return d === "tokens" ? fmtTokens : fmtNum;
}

/** Signed formatter, for net figures. */
export function signedFmt(d: Denom): (n: number) => string {
  if (isUsd(d)) return fmtUsdSigned;
  return d === "tokens" ? fmtTokensSigned : fmtSigned;
}

/**
 * The dollar unit, never bare "USD".
 *
 * The backend prices at the *current* price — every flow bucket, and every
 * escrow balance — so a dollar figure is what that volume or balance would be
 * worth today rather than what it was worth when it moved. Every label that
 * names dollars is built from this, so the caveat cannot go missing from one of
 * them.
 */
export const USD_AT_SPOT = "USD · at spot";

/**
 * Unit name for a tile label, where there is no room for the full caveat.
 *
 * `usd-partial` still says "partial": a tile is often the only thing a reader
 * looks at, and a net figure that silently drops an unpriced asset can be wrong
 * in either direction — it is not a floor the way a total is.
 */
export function unitShort(d: Denom): string {
  if (d === "usd") return USD_AT_SPOT;
  if (d === "usd-partial") return joinMeta([USD_AT_SPOT, "partial"]);
  return d === "tokens" ? "tokens" : "—";
}

/**
 * Project a bucket onto the series to show. The `?? 0` fallbacks are
 * unreachable: `pickDenom` only returns a mode whose fields are non-null in
 * every bucket.
 */
export function amounts(p: FlowPoint, d: Denom): { in: number; out: number } {
  return isUsd(d) ? { in: p.inUsd ?? 0, out: p.outUsd ?? 0 } : { in: p.in ?? 0, out: p.out ?? 0 };
}

/** Short label naming the unit, for card metadata. */
export function denomLabel(d: Denom, flows: FlowPoint[] | null): string {
  if (d === "tokens") return "whole tokens";
  if (d === "usd") return USD_AT_SPOT;
  if (d === "usd-partial") {
    // The worst bucket, because that is how many assets the range as a whole
    // cannot account for.
    const worst = Math.max(0, ...(flows ?? []).map((p) => p.unpricedAssets));
    return joinMeta([USD_AT_SPOT, `${worst} unpriced asset${worst === 1 ? "" : "s"} excluded`]);
  }
  return "no common unit — pick one asset";
}
