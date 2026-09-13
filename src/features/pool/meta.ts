import type { PoolNotes } from "@/api";
import type { LockedSummary } from "@/lib/aggregate";
import { USD_AT_SPOT } from "@/lib/denom";
import { fmtUsd, joinMeta, plural } from "@/lib/format";
import { type CardMeta, gapList, LOADING } from "@/ui/cardMeta";

/**
 * What the note counts are, and what they are not.
 *
 * Named "per chain" rather than totalled: the trees are separate, so the counts
 * do not add. The caption says so because the card's shape — a list of numbers —
 * otherwise invites summing them.
 */
export function poolNotesMeta(notes: PoolNotes[] | null): CardMeta {
  if (!notes) return LOADING;
  if (notes.length === 0) return { lead: "no notes committed" };
  const feeNotes = notes.reduce((sum, n) => sum + n.feeNotes, 0);
  return {
    lead: `${notes.length} chains`,
    basis: "not summable · user notes",
    gaps: gapList(feeNotes > 0 && `${feeNotes.toLocaleString()} relayer notes excluded`),
  };
}

/**
 * The escrow card's own caveat line: what the network holds, and what that
 * figure is leaving out. A chain whose assets are all unpriced contributes
 * nothing to the total, so the count of excluded assets travels with it.
 */
export function lockedMeta(summary: LockedSummary | null): CardMeta {
  if (!summary) return LOADING;
  if (summary.chains === 0) return { lead: "nothing escrowed" };
  const { chains, totalUsd, unpricedAssets, venueHeldAssets } = summary;
  return {
    lead:
      totalUsd === null
        ? `${chains} chains · no usable prices`
        : `${fmtUsd(totalUsd)} across ${chains} chains`,
    // The definition is conditional because it is not one definition. A yield
    // asset's balance is read from its venue, and claiming the whole card is
    // "deposits − withdrawals" while any such asset is in it is simply wrong —
    // that difference misses everything those assets have earned.
    basis: joinMeta([
      venueHeldAssets > 0
        ? `deposits − withdrawals, except ${plural(venueHeldAssets, "venue-held asset")}`
        : "deposits − withdrawals",
      USD_AT_SPOT,
    ]),
    gaps: gapList(unpricedAssets > 0 && `${plural(unpricedAssets, "unpriced asset")} excluded`),
  };
}
