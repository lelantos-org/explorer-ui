import { ALL_KINDS, isTxKind, type KindFilter } from "@/domain/kinds";
import { type Range, resolveRange } from "@/domain/ranges";
import { EMPTY_SCOPE, parseId, type Scope } from "@/domain/scope";

/**
 * The page's filters as they are spelled in the URL, and the only code that
 * reads or writes that spelling.
 *
 * Pure functions over `URLSearchParams`, so a hand-edited or shared link can be
 * tested for exactly what it selects.
 */

export const PARAM = {
  chain: "chain",
  asset: "asset",
  range: "range",
  kind: "kind",
} as const;

export interface UrlFilters {
  scope: Scope;
  range: Range;
  txKind: KindFilter;
}

/** Set a param, or drop it entirely when the value is empty — no `?chain=` noise. */
export function setOrDelete(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value);
  else params.delete(key);
}

const idText = (id: number | null) => (id === null ? "" : String(id));

/**
 * What a query string selects. Every part falls back rather than failing: the
 * URL is hand-editable and shared, so a typo should cost the view that was
 * asked for, not the page.
 */
export function readFilters(params: URLSearchParams): UrlFilters {
  const chainId = parseId(params.get(PARAM.chain));
  const kind = params.get(PARAM.kind);
  return {
    // An asset id is only unique within its chain, so it cannot outlive one.
    scope:
      chainId === null ? EMPTY_SCOPE : { chainId, assetIdU64: parseId(params.get(PARAM.asset)) },
    range: resolveRange(params.get(PARAM.range)),
    // An unknown kind reads as no filter — the backend rejects one it does not
    // know, and a hand-edited URL should show the feed, not an error.
    txKind: isTxKind(kind) ? kind : ALL_KINDS,
  };
}

/** Write a scope. The asset param cannot outlive its chain, so clearing the
 *  chain clears it too rather than leaving a dangling `?asset=`. */
export function writeScope(params: URLSearchParams, scope: Scope): void {
  setOrDelete(params, PARAM.chain, idText(scope.chainId));
  setOrDelete(params, PARAM.asset, scope.chainId === null ? "" : idText(scope.assetIdU64));
}
