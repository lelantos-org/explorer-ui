import type { AnonymitySet, AnonymitySetQuery, PoolNotes, TxOut } from "../types";
import type { TreeAdvance } from "./generate";

/** Matches the backend's own default page. */
const DEFAULT_LIMIT = 100;

/** Matches the backend's own default lookback. */
const DEFAULT_RECENT_SEC = 30 * 86_400;

/**
 * Withdrawal cohorts, grouped the way the backend groups them.
 *
 * Derived from the mock's own classified feed rather than generated separately,
 * so a withdrawal's `publicOut` in the feed and its cohort size here cannot
 * disagree — the UI joins the two, and a mock that let them drift would show a k
 * that no row supports.
 *
 * Withdrawals with no denomination are skipped, never counted as a zero one:
 * `null` means the indexer never observed the value, which is not a cohort.
 */
export function anonymitySets(
  transactions: TxOut[],
  q: AnonymitySetQuery,
  nowSec: number,
): AnonymitySet[] {
  // Counted from the same rows as `count`, so `recentCount <= count` holds by
  // construction rather than by two passes that could disagree.
  const recentFrom = nowSec - (q.recentSec ?? DEFAULT_RECENT_SEC);
  const byDenom = new Map<string, AnonymitySet>();
  for (const t of transactions) {
    if (t.kind !== "withdraw" || t.publicOut === null || t.assetIdU64 === null) continue;
    if (q.chainId !== undefined && t.chainId !== q.chainId) continue;
    if (q.assetIdU64 !== undefined && t.assetIdU64 !== q.assetIdU64) continue;

    const key = `${t.chainId}:${t.assetIdU64}:${t.publicOut}`;
    const seen = byDenom.get(key);
    if (seen === undefined) {
      byDenom.set(key, {
        chainId: t.chainId,
        assetIdU64: t.assetIdU64,
        publicOut: t.publicOut,
        count: 1,
        recentCount: t.blockTs >= recentFrom ? 1 : 0,
        firstTs: t.blockTs,
        lastTs: t.blockTs,
      });
      continue;
    }
    seen.count += 1;
    // The mock always reports a window, so this is never the null the wire
    // type allows for an un-redeployed backend.
    if (t.blockTs >= recentFrom) seen.recentCount = (seen.recentCount ?? 0) + 1;
    seen.firstTs = Math.min(seen.firstTs, t.blockTs);
    seen.lastTs = Math.max(seen.lastTs, t.blockTs);
  }

  // Ascending by denomination, as the SQL orders it. Numeric, not
  // lexicographic: "1000" sorts before "200" as a string.
  return [...byDenom.values()]
    .sort(
      (a, b) =>
        a.chainId - b.chainId ||
        a.assetIdU64 - b.assetIdU64 ||
        Number(a.publicOut) - Number(b.publicOut),
    )
    .slice(0, q.limit ?? DEFAULT_LIMIT);
}

/**
 * Tree occupancy per chain.
 *
 * `leaves` is `max(startIndex + inserted)`, the contract's `committedCount`.
 * `feeNotes` counts flushed deposits, since each deposit occupies two adjacent
 * leaves and the second pays whoever flushed it — so it is taken from the same
 * classified feed the deposit badges come from.
 */
export function poolNotes(
  advances: TreeAdvance[],
  transactions: TxOut[],
  chainId?: number,
): PoolNotes[] {
  const byChain = new Map<number, PoolNotes>();
  for (const a of advances) {
    if (chainId !== undefined && a.chainId !== chainId) continue;
    const seen = byChain.get(a.chainId);
    const leaves = a.startIndex + a.inserted;
    if (seen === undefined) {
      byChain.set(a.chainId, { chainId: a.chainId, leaves, feeNotes: 0, lastTs: a.blockTs });
      continue;
    }
    seen.leaves = Math.max(seen.leaves, leaves);
    seen.lastTs = Math.max(seen.lastTs, a.blockTs);
  }

  for (const t of transactions) {
    if (t.kind !== "deposit") continue;
    const chain = byChain.get(t.chainId);
    if (chain !== undefined) chain.feeNotes += 1;
  }

  return [...byChain.values()].sort((a, b) => a.chainId - b.chainId);
}
