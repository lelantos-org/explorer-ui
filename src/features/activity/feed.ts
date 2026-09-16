import type { TxOut } from "@/api";

/** How many transactions the feed shows. Its skeleton draws the same number of
 *  rows, so the card is its final height before the rows arrive. */
export const FEED_LIMIT = 20;

/** A row's identity in the feed. The hash alone repeats: one bundled
 *  transaction can hold several operations, possibly of one kind, and only the
 *  log index tells them apart. */
export const txRowKey = (tx: TxOut): string =>
  `${tx.chainId}-${tx.txHashHex}-${tx.kind}-${tx.logIndex}`;
