import type { TxOut } from "@/api";
import { type CardMeta, LOADING } from "@/ui/cardMeta";

/** How much of the feed is on show. "Every chain" is load-bearing: the filter
 *  bar's chain does not reach this card, and unsaid a scoped page reads its
 *  rows as that chain's. */
export function activityMeta(txs: TxOut[] | null): CardMeta {
  if (!txs) return LOADING;
  return { lead: `${txs.length} most recent · every chain` };
}
