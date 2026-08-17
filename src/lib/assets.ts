import type { AssetOut } from "../api";
import { shortHex } from "./hex";

/** Assets are keyed by chain: `assetIdU64` is only unique within one. */
export const assetKey = (chainId: number, assetIdU64: number) => `${chainId}:${assetIdU64}`;

/** The registry as a lookup, for the pages that resolve an asset per row. */
export function indexAssets(assets: AssetOut[] | null): Map<string, AssetOut> {
  return new Map((assets ?? []).map((a) => [assetKey(a.chainId, a.assetIdU64), a]));
}

/**
 * How an asset is named wherever the UI has to fit it in one line.
 *
 * The symbol is the only label a reader recognises, so it leads whenever the
 * indexer has it. Without one — not read yet, or a token with no `symbol()` —
 * the address is the fallback: it identifies the token, where the registry id
 * only identifies the row.
 */
export function assetLabel(asset: AssetOut): string {
  return asset.symbol ?? shortHex(asset.tokenHex, 4);
}

/**
 * The picker form, which keeps the address even alongside a symbol: any ERC20
 * can register, so two tokens on one chain may claim the same symbol and the
 * options have to stay tellable apart.
 */
export function assetOptionLabel(asset: AssetOut): string {
  const address = shortHex(asset.tokenHex, 4);
  return asset.symbol ? `${asset.symbol} · ${address}` : address;
}
