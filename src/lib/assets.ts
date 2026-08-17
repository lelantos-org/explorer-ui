import type { AssetOut } from "../api";
import { joinMeta } from "./format";
import { shortHex } from "./hex";
import type { Scope } from "./scope";

/** Leading/trailing hex characters kept when an address stands in for a name. */
const ADDRESS_CHARS = 4;

/**
 * All a label needs: what the token calls itself, and the address that
 * identifies it either way. Kept narrower than `AssetOut` so every endpoint
 * that names a token — the registry, escrow balances — labels it identically
 * without carrying the registry's other fields.
 */
export type AssetIdentity = Pick<AssetOut, "symbol" | "tokenHex">;

const address = (asset: AssetIdentity) => shortHex(asset.tokenHex, ADDRESS_CHARS);

/** Assets are keyed by chain: `assetIdU64` is only unique within one. */
export const assetKey = (chainId: number, assetIdU64: number) => `${chainId}:${assetIdU64}`;

/** The registry as a lookup, for the pages that resolve an asset per row. */
export function indexAssets(assets: AssetOut[] | null): Map<string, AssetOut> {
  return new Map((assets ?? []).map((a) => [assetKey(a.chainId, a.assetIdU64), a]));
}

/**
 * The registry narrowed to what the filter bar has selected. `null` while it is
 * still loading, so a caller can tell "none in scope" from "not known yet".
 *
 * Counts have to be taken from this rather than the whole registry: a headline
 * naming a chain beside a registry-wide count reads as that many assets on the
 * chain.
 */
export function assetsInScope(assets: AssetOut[] | null, scope: Scope): AssetOut[] | null {
  if (!assets) return null;
  // The scope arrives as URL text; parse it once and compare numbers, so a
  // hand-edited "07" still selects chain 7.
  const chainId = scope.chainId ? Number(scope.chainId) : null;
  const assetIdU64 = scope.assetIdU64 ? Number(scope.assetIdU64) : null;
  return assets.filter(
    (a) =>
      (chainId === null || a.chainId === chainId) &&
      (assetIdU64 === null || a.assetIdU64 === assetIdU64),
  );
}

/**
 * How an asset is named wherever the UI has to fit it in one line.
 *
 * The symbol is the only label a reader recognises, so it leads whenever the
 * indexer has it. Without one — not read yet, or a token with no `symbol()` —
 * the address is the fallback: it identifies the token, where the registry id
 * only identifies the row.
 */
export function assetLabel(asset: AssetIdentity): string {
  return asset.symbol ?? address(asset);
}

/**
 * The picker form, which keeps the address even alongside a symbol: any ERC20
 * can register, so two tokens on one chain may claim the same symbol and the
 * options have to stay tellable apart.
 */
export function assetOptionLabel(asset: AssetIdentity): string {
  return joinMeta([asset.symbol, address(asset)]);
}
