import type { AssetOut } from "../api";
import { shortHex } from "./hex";

/**
 * How an asset is named wherever the UI has to fit it in one line.
 *
 * The symbol is the only label a reader recognises, so it leads whenever the
 * indexer has it. Without one — not read yet, or a token with no `symbol()` —
 * the address is the fallback: it identifies the token, where the registry id
 * only identifies the row.
 */
export function assetLabel(asset: AssetOut | undefined): string | null {
  if (!asset) return null;
  return asset.symbol ?? shortHex(asset.tokenHex, 4);
}
