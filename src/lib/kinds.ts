import type { TxKind } from "../api";

/**
 * What each kind means, in one place: the feed's badges and the filter above
 * them label the same four things, and a reader comparing the two should not
 * meet two wordings of one fact.
 *
 * `pending` is the only kind that can still change: it becomes `deposit` once
 * the relayer flushes it into the tree.
 */
export const KIND_TITLE: Record<TxKind, string> = {
  deposit: "escrowed deposit, flushed into the tree",
  pending: "escrowed deposit, awaiting a flush",
  transfer: "internal transfer between shielded notes — no public value moved",
  withdraw: "unshield to a public recipient",
};
