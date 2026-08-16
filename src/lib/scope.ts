import type { AssetOut, ChainFlow } from "../api";

/**
 * The chain+asset selection carried as one value.
 *
 * `assetIdU64` is only unique within a chain, so an asset is never addressable
 * without the chain that owns it — the two are always encoded and decoded
 * together, and the picker offers them as a single control.
 *
 * `""` → all chains · `"<chainId>:"` → whole chain · `"<chainId>:<assetIdU64>"` → one asset.
 */
export interface Scope {
  chainId: string;
  assetIdU64: string;
}

export const EMPTY_SCOPE: Scope = { chainId: "", assetIdU64: "" };

export function encodeScope(s: Scope): string {
  return s.chainId ? `${s.chainId}:${s.assetIdU64}` : "";
}

export function decodeScope(value: string): Scope {
  const [chainId = "", assetIdU64 = ""] = value.split(":");
  // An asset without a chain is not addressable, so it is dropped rather than
  // carried as a half-selection.
  return chainId ? { chainId, assetIdU64 } : EMPTY_SCOPE;
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
