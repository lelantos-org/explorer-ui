/** What the pool holds: escrowed balances, and the yield venues some of it earns in. */

/**
 * How a locked balance was arrived at.
 *
 * Two assets in the same response can be measured differently, so the figure
 * carries its own definition rather than leaving the UI to assume one.
 *
 * - `flowDifference` — all-time deposits minus withdrawals. Exact for plain
 *   custody, where nothing but a flow moves the balance.
 * - `venueHoldings` — what the pool and its venue actually hold, read from
 *   chain. Used for a yield asset, whose balance grows with no flow to observe,
 *   so the flow difference would understate it by everything ever earned.
 */
export type LockedBasis = "flowDifference" | "venueHoldings";

/** One asset's escrowed balance on one chain. */
export interface LockedAsset {
  assetIdU64: number;
  tokenHex: string;
  symbol: string | null;
  /**
   * Whole tokens. null when the token's decimals are unresolved — unknown, and
   * base units would be wrong by orders of magnitude.
   *
   * Negative is possible and is not a display bug: the escrow cannot owe money,
   * so it means the indexer missed deposits.
   */
  amount: number | null;
  /** The balance at the current spot price. null = no usable price. */
  lockedUsd: number | null;
  /**
   * Newest flow behind the balance, for ageing it.
   *
   * For a `venueHoldings` balance this ages the last *flow*, not the last index
   * refresh: the balance itself is as fresh as the indexer's poll, which
   * `YieldAsset.updatedAt` carries.
   */
  lastTs: number;
  /**
   * Which definition produced `amount`.
   *
   * Optional on the wire, not in spirit: a backend predating the yield endpoints
   * omits it. Absent is treated as `flowDifference`, which is what such a
   * backend was reporting for every asset anyway.
   */
  basis: LockedBasis;
}

/**
 * A chain's escrowed balance. `lockedUsd` is the only figure that adds up
 * across assets, and it covers only the priced ones — `unpricedAssets` counts
 * the rest, exactly as `FlowPoint` does.
 */
export interface ChainLocked {
  chainId: number;
  lockedUsd: number | null;
  unpricedAssets: number;
  assets: LockedAsset[];
}

/**
 * One yield-bearing asset: its venue binding, and the last state polled from
 * the pool.
 *
 * Having a row here is what makes an asset yield-bearing — the binding is
 * created by an event and nothing on chain undoes it — so a halted asset is
 * still in this list, and `AssetOut` carries no yield flag that could disagree.
 *
 * The fields arrive by two mechanisms and are absent for different reasons.
 * `venueHex`, `bufferBps`, `perfBps` and `halted` come from logs and are always
 * present. Everything from `gross` down is polled, and is null *together* until
 * the first poll lands — a newly bound asset, or one whose venue has been
 * unreachable. `updatedAt` ages whatever is present.
 *
 * **Two units share this row.** `gross`, `idle` and `accruedFee` are whole
 * tokens. `totalNormalized`, `accruedFeeNormalized` and `indexRay` are not
 * denominated in the token at all, and are kept as strings for the reason
 * `AnonymitySet.publicOut` is: they exceed JSON's exact-integer range, and
 * nothing should be doing arithmetic on them.
 */
export interface YieldAsset {
  chainId: number;
  assetIdU64: number;
  tokenHex: string;
  symbol: string | null;
  /** The venue this asset's custody earns in, lowercase hex without `0x`. */
  venueHex: string;
  /**
   * Share of the asset the pool targets holding outside the venue, in basis
   * points, so a withdrawal need not unwind a position. A real `0` is a valid
   * configuration and arrives as `0`, never as null.
   */
  bufferBps: number;
  /** The protocol's cut of yield earned, in basis points. */
  perfBps: number;
  /** Whether accrual is halted. A halt does not unbind the venue. */
  halted: boolean;
  /**
   * Everything backing the asset, in whole tokens: the venue position plus
   * `idle`. This is the balance, and it is what the escrow card reports for this
   * asset. null while unpolled, or while decimals are unresolved.
   */
  gross: number | null;
  /** The part of `gross` held outside the venue, in whole tokens. Compare
   *  against `bufferBps` to see whether the buffer is on target. */
  idle: number | null;
  /**
   * The protocol's earned-but-unswept fee, in whole tokens.
   *
   * null when unpolled, when decimals are unresolved, and when nothing has been
   * minted — no supply means no rate to convert at, which is not a fee of zero.
   */
  accruedFee: number | null;
  /** Normalized units owed to note holders. **Not tokens**; opaque here. */
  totalNormalized: string | null;
  /** The protocol's unswept normalized units. **Not tokens** — `accruedFee` is
   *  the same quantity converted. */
  accruedFeeNormalized: string | null;
  /** The conversion rate scaled by RAY (1e27), as a decimal string. For display
   *  only; see `lib/yield`. */
  indexRay: string | null;
  /** Block the polled values were read at. */
  blockNumber: number | null;
  /** When the poll landed, for ageing the row. */
  updatedAt: number | null;
}
