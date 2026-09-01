/**
 * Wire types for the explorer backend, and the client interface over them.
 *
 * Every DTO the backend speaks lives here — there is no second types module.
 * Import them through `../api`, not from this file directly.
 */

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

export interface FlowPoint {
  ts: number;
  /**
   * Whole tokens, present only when exactly one asset is in scope (pin one
   * with `assetIdU64`). null otherwise: amounts of different tokens are not
   * addable in any unit, so there is no cross-asset token total.
   */
  in: number | null;
  out: number | null;
  /**
   * USD across the assets that could be priced. null = nothing in the bucket
   * had a price. A non-zero `unpricedAssets` means these cover only part of
   * the volume in `in`/`out`.
   */
  inUsd: number | null;
  outUsd: number | null;
  unpricedAssets: number;
}

export interface CountPoint {
  ts: number;
  count: number;
}

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

export interface FlowQuery {
  chainId?: number;
  assetIdU64?: number;
  bucketSec?: number;
  sinceTs?: number;
}

export interface CountQuery {
  chainId?: number;
  bucketSec?: number;
  sinceTs?: number;
}

/** What a transaction did. Mutually exclusive; derived from contract events. */
export type TxKind = "deposit" | "pending" | "transfer" | "withdraw";

export const TX_KINDS: TxKind[] = ["deposit", "pending", "transfer", "withdraw"];

export interface TxOut {
  chainId: number;
  txHashHex: string;
  blockNumber: number;
  blockTs: number;
  kind: TxKind;
  /** null for transfers, which move no public value. */
  assetIdU64: number | null;
  /** Whole tokens as a decimal string; null for transfers and unknown decimals. */
  amount: string | null;
  /**
   * The circuit value this withdrawal published — the key its anonymity set is
   * grouped by. Join against `getAnonymitySets` on
   * `(chainId, assetIdU64, publicOut)` for the cohort size.
   *
   * null for every non-withdrawal kind, and for a withdrawal indexed before the
   * contract emitted the field. Both mean the denomination is unknown, which is
   * not the same as a cohort of zero.
   *
   * Kept as a string: the value is a uint64, so `Number()` would round two
   * distinct denominations together at the top of the range.
   */
  publicOut: string | null;
}

export interface KindCounts {
  ts: number;
  deposit: number;
  pending: number;
  transfer: number;
  withdraw: number;
}

/**
 * One withdrawal denomination and the cohort that published it.
 *
 * The anonymity set is actual, not potential: `count` is how many withdrawals of
 * this denomination the pool has seen, not how many it could support. `count: 1`
 * is a withdrawal with no cover at all.
 */
export interface AnonymitySet {
  chainId: number;
  assetIdU64: number;
  /** The published circuit value. An opaque key — never `Number()` it, and never
   *  convert it: a denomination is fixed while the yield index moves what it is
   *  worth, so the raw integer is the only stable identity for a cohort. */
  publicOut: string;
  /**
   * Withdrawals that published this denomination, over all history: the k.
   *
   * An upper bound on cover, not a headcount. It counts withdrawals, not
   * distinct users — one person exiting repeatedly at one denomination is
   * indistinguishable here from that many separate users, and telling them
   * apart would need recipient addresses the backend does not index.
   */
  count: number;
  /**
   * How many of those fell inside the requested `recentSec` lookback.
   *
   * A subset of `count`, never a replacement. Cover shared with nobody recently
   * is cover that may no longer be there: a denomination abandoned a year ago
   * still reports its full historical `count`. Zero means dormant.
   *
   * `null` when the backend did not send the field at all — it predates the
   * recency window. Unknown, **not** zero: defaulting it to zero would render
   * every cohort dormant and claim a loss of cover that was never measured.
   */
  recentCount: number | null;
  firstTs: number;
  lastTs: number;
}

/**
 * One chain's commitment-tree occupancy.
 *
 * Scale and liveness context, not a privacy score — the total only ever grows,
 * and no single action is covered by the whole tree. Never sum `leaves` across
 * chains: each chain has its own tree, so notes on one are no cover on another.
 */
export interface PoolNotes {
  chainId: number;
  /** Leaves committed to the tree. Includes relayer fee notes and spent notes. */
  leaves: number;
  /** Of those, relayer fee notes: one per flushed deposit, since a deposit
   *  occupies two adjacent leaves. `leaves - feeNotes` belongs to users. */
  feeNotes: number;
  lastTs: number;
}

export interface ChainFlow {
  chainId: number;
  inflow: number;
  outflow: number;
  hourlyIn: number[];
  hourlyOut: number[];
  txCount: number;
}

export interface AnonymitySetQuery {
  chainId?: number;
  assetIdU64?: number;
  limit?: number;
  /** Lookback for `recentCount`. Does not filter `count`, which is always
   *  all-history. */
  recentSec?: number;
}

export interface RecentTxQuery {
  chainId?: number;
  sinceTs?: number;
  /** One kind only; absent = every kind. Filtered before `limit` applies, so
   *  a pinned kind still comes back a full page at a time. */
  kind?: TxKind;
  limit?: number;
}

/**
 * Everything the UI can ask the backend for.
 *
 * `/v1/tree-advances` is deliberately absent: the classified
 * `getRecentTransactions` feed replaced the client-side paging of raw tree
 * advances, and no screen reads them any more. The mock still synthesises
 * advances internally to derive that feed.
 */
export interface ExplorerApi {
  health(): Promise<boolean>;
  listAssets(chainId?: number): Promise<AssetOut[]>;
  getAssetFlows(q: FlowQuery): Promise<FlowPoint[]>;
  getTxCounts(q: CountQuery): Promise<CountPoint[]>;
  getChainFlows24h(): Promise<ChainFlow[]>;
  /** Escrowed balances per chain, richest first. All chains when unscoped. */
  getLocked(chainId?: number): Promise<ChainLocked[]>;
  /** Newest-first classified feed. */
  getRecentTransactions(q: RecentTxQuery): Promise<TxOut[]>;
  getTxKinds(q: CountQuery): Promise<KindCounts[]>;
  /** Withdrawal cohorts per denomination, over all history. Unscoped returns
   *  every chain and asset, which is what the feed needs to annotate itself. */
  getAnonymitySets(q: AnonymitySetQuery): Promise<AnonymitySet[]>;
  /** Tree occupancy, one row per chain. */
  getPoolNotes(chainId?: number): Promise<PoolNotes[]>;
  /** Yield-bearing assets, in registry order. Unscoped returns every chain,
   *  which is the network-wide view the card wants. */
  getYield(chainId?: number): Promise<YieldAsset[]>;
}
