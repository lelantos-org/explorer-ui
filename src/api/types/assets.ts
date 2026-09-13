/** The asset registry: what the pool accepts, and what each leg costs. */

export interface AssetOut {
  chainId: number;
  assetIdU64: number;
  tokenHex: string;
  /** Circuit capacity parameter, NOT a decimals normalizer. Never use this to
   *  render an amount — use `decimals`. */
  scale: string;
  /** ERC20 decimals. null = not yet resolved by the indexer; unknown, not 18. */
  decimals: number | null;
  /** ERC20 symbol. null = not yet read by the indexer, or the token has no
   *  `symbol()`. Never invent a label for it — fall back to the address. */
  symbol: string | null;
  /** Spot USD price of one whole token. null = unknown, never 0. */
  priceUsd: number | null;
  /** Provider timestamp for priceUsd. null whenever priceUsd is. */
  priceAt: number | null;
  /** Protocol fee on a shield of this asset, in basis points, charged **on top
   *  of** the principal. Rates are per asset and per leg — the pool has no
   *  global fee — so null means the indexer has not seen an `AssetFeeSet` yet.
   *  Never render null as 0: a real 0 is a common configuration and arrives as
   *  the number 0. */
  depositBps: number | null;
  /** Protocol fee on an unshield of this asset, in basis points, **skimmed
   *  from** the proceeds. Same null semantics as `depositBps`. */
  withdrawBps: number | null;
}
