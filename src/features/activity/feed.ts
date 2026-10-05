import type { TxOut } from "@/api";

/** How many transactions the feed shows. Its skeleton draws the same number of
 *  rows, so the card is its final height before the rows arrive. */
export const FEED_LIMIT = 20;

/** The feed's sizes, smallest first. Each "show more" moves one step up. */
const FEED_STEPS = [FEED_LIMIT, 50, 100];

/**
 * The limit a "show more" would request, or null when there is nothing more to
 * ask for: the last step is on show, or the feed came back short of its limit
 * and so has no older rows.
 */
export function nextFeedLimit(limit: number, shown: number): number | null {
  if (shown < limit) return null;
  return FEED_STEPS.find((step) => step > limit) ?? null;
}

/** A row's identity in the feed. The hash alone repeats: one bundled
 *  transaction can hold several operations, possibly of one kind, and only the
 *  log index tells them apart. */
export const txRowKey = (tx: TxOut): string =>
  `${tx.chainId}-${tx.txHashHex}-${tx.kind}-${tx.logIndex}`;
