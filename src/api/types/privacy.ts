/** Anonymity sets per withdrawal denomination, and commitment-tree occupancy. */

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

export interface AnonymitySetQuery {
  chainId?: number;
  assetIdU64?: number;
  limit?: number;
  /** Lookback for `recentCount`. Does not filter `count`, which is always
   *  all-history. */
  recentSec?: number;
}
