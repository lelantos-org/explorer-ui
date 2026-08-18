import type { AssetOut, ChainFlow } from "../api";

/**
 * The chain+asset selection carried as one value.
 *
 * `assetIdU64` is only unique within a chain, so an asset is never addressable
 * without the chain that owns it — the two are always encoded and decoded
 * together, and the picker offers them as a single control.
 *
 * Ids are numbers here, not the text they arrived as: the URL is the only place
 * a scope is a string, and `decodeScope`/`parseId` are the only crossings. Below
 * that line every comparison is numeric, so a hand-edited `?chain=07` selects
 * chain 7 rather than missing every row.
 */
export interface Scope {
  chainId: number | null;
  assetIdU64: number | null;
}

export const EMPTY_SCOPE: Scope = { chainId: null, assetIdU64: null };

/** A whole chain, with no asset pinned inside it. */
export const chainScope = (chainId: number): Scope => ({ chainId, assetIdU64: null });

/** Whether anything at all is pinned. An asset cannot be pinned without its
 *  chain, so the chain alone answers this. */
export const isScoped = (s: Scope): boolean => s.chainId !== null;

/**
 * Read an id out of untrusted text — a URL param, or half a picker value.
 *
 * Digits only: `?chain=abc` is dropped rather than forwarded to the API as
 * `NaN`, and anything negative or fractional is not an id in the first place.
 */
export function parseId(value: string | null | undefined): number | null {
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

/** `""` → all chains · `"<chainId>:"` → whole chain · `"<chainId>:<assetIdU64>"` → one asset. */
export function encodeScope(s: Scope): string {
  if (s.chainId === null) return "";
  return `${s.chainId}:${s.assetIdU64 ?? ""}`;
}

export function decodeScope(value: string): Scope {
  const [chainPart, assetPart] = value.split(":");
  const chainId = parseId(chainPart);
  // An asset without a chain is not addressable, so it is dropped rather than
  // carried as a half-selection.
  if (chainId === null) return EMPTY_SCOPE;
  return { chainId, assetIdU64: parseId(assetPart) };
}

/** One chain and the assets it owns, in the order the picker lists them. */
export interface ScopeGroup {
  chainId: number;
  assets: AssetOut[];
}

/**
 * Group assets under their chain for the scope picker. Chains that report
 * activity but own no assets still get a group, so the picker never hides a
 * chain the rest of the page is showing.
 */
export function groupAssetsByChain(
  assets: AssetOut[] | null,
  chainFlows: ChainFlow[] | null,
): ScopeGroup[] {
  const byChain = new Map<number, AssetOut[]>();
  for (const c of chainFlows ?? []) byChain.set(c.chainId, []);
  for (const a of assets ?? []) {
    const list = byChain.get(a.chainId);
    if (list) list.push(a);
    else byChain.set(a.chainId, [a]);
  }
  return [...byChain.entries()]
    .sort(([a], [b]) => a - b)
    .map(([chainId, list]) => ({
      chainId,
      assets: [...list].sort((x, y) => x.assetIdU64 - y.assetIdU64),
    }));
}
