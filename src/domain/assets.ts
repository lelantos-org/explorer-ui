import type { AssetOut } from "@/api/types";
import { shortHex } from "@/lib/hex";
import { joinMeta } from "@/lib/text";
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

/**
 * Any per-asset rows as a lookup, for the pages that resolve an asset per row.
 *
 * Generic over the row rather than fixed to `AssetOut`: the registry, the
 * transaction feed and the yield bindings all key the same way, and a second
 * copy of this `Map` construction is how two of them end up keying differently.
 *
 * `null` folds to an empty map. A caller that needs to tell "not loaded" from
 * "none" keeps that distinction outside this function, where it has the loading
 * state to hand.
 */
export function indexAssets<T extends { chainId: number; assetIdU64: number }>(
  rows: T[] | null,
): Map<string, T> {
  return new Map((rows ?? []).map((r) => [assetKey(r.chainId, r.assetIdU64), r]));
}

/**
 * The registry narrowed to what the filter bar has selected. `null` while it is
 * still loading, so a caller can tell "none in scope" from "not known yet".
 *
 * Counts have to be taken from this rather than the whole registry: a headline
 * naming a chain beside a registry-wide count reads as that many assets on the
 * chain.
 *
 * The scope arrives already parsed — `domain/scope` is where URL text becomes ids —
 * so this only ever compares numbers.
 */
export function assetsInScope(assets: AssetOut[] | null, scope: Scope): AssetOut[] | null {
  if (!assets) return null;
  const { chainId, assetIdU64 } = scope;
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
 * An asset named together with the circuit id it is registered under.
 *
 * A separate type from `AssetIdentity` because not every caller has an id —
 * `AssetLink` names a token by address for an explorer link, where the
 * registration it arrived through is not the subject.
 */
export type AssetChoice = AssetIdentity & Pick<AssetOut, "assetIdU64">;

/**
 * The circuit's own name for an asset: its `publicAssetId`.
 *
 * Shown wherever assets are listed together, because neither the symbol nor the
 * address distinguishes them. `AssetRegistry` rejects a duplicate id but not a
 * duplicate token, so one ERC-20 is routinely registered more than once — a
 * plain entry and a yield-bearing one being the ordinary case, identical in
 * symbol, address, scale and decimals.
 *
 * That difference is not cosmetic. The id is what the circuit binds and what a
 * withdrawal publishes, so two registrations of one token are two separate
 * anonymity sets: a withdrawal under one gives no cover to a withdrawal under
 * the other. A UI that prints them alike invites the reader to pool them.
 */
export const assetIdTag = (assetIdU64: number): string => `#${assetIdU64}`;

/**
 * The picker form, which keeps both the address and the id alongside a symbol.
 *
 * The address was here first, for two different tokens claiming one symbol.
 * That is the weaker case: two registrations of the *same* token share the
 * address too, so only the id tells those apart — and the picker scopes the
 * whole page, so choosing the wrong one silently swaps which anonymity set
 * every card below is describing.
 */
export function assetOptionLabel(asset: AssetChoice): string {
  return joinMeta([joinParts([asset.symbol, assetIdTag(asset.assetIdU64)]), address(asset)]);
}

/** The id rides directly on the name it disambiguates ("WETH #4"), rather than
 *  becoming a third peer in the metadata list where it would read as unrelated
 *  to the symbol it qualifies. */
const joinParts = (parts: (string | null)[]): string => parts.filter(Boolean).join(" ");
