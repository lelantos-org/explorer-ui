import { TX_KINDS, type TxKind } from "@/api/types";

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

/** No kind pinned. A URL param and a `<Segmented>` value are both strings, so
 *  "every kind" needs a spelling rather than being `undefined` in one place and
 *  a missing option in the other. */
export const ALL_KINDS = "" as const;

/** A kind, or `ALL_KINDS`. */
export type KindFilter = TxKind | typeof ALL_KINDS;

/**
 * The kinds partition the feed, so "all" is the fifth choice in the same set
 * and not the absence of one — hence an option rather than a clear button.
 */
export const KIND_FILTER_OPTIONS: { value: KindFilter; label: string; title: string }[] = [
  { value: ALL_KINDS, label: "all", title: "every kind" },
  ...TX_KINDS.map((kind) => ({ value: kind, label: kind, title: KIND_TITLE[kind] })),
];

/** Narrows a string off the wire or out of the URL — neither is trusted to be
 *  a kind just because it is present. */
export function isTxKind(value: string | null): value is TxKind {
  return TX_KINDS.some((kind) => kind === value);
}

/**
 * The kinds this chart plots.
 *
 * `pending` is left out: it is a transient state, not an outcome. Every pending
 * escrow becomes a `deposit` once the relayer flushes it, so plotting both puts
 * the same escrow on the chart twice — once where it was seen and again where
 * it settled — and the pending bars in older buckets keep shrinking as history
 * catches up. The feed still carries it, and the latest-transactions table
 * still badges it, where it reads as live state rather than as a measurement.
 *
 * Derived from `TX_KINDS` so a kind added to the wire type reaches the chart and its legend
 * without a second edit here.
 */
export const PLOTTED_KINDS: readonly TxKind[] = TX_KINDS.filter((k) => k !== "pending");
