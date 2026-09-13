import type { AnonymitySet } from "@/api";
import { coverTone, isDormant, RECENT_WINDOW_SEC, THIN_SET } from "@/lib/cover";
import { fmtBucket, plural } from "@/lib/format";
import { type CardMeta, gapList, LOADING } from "@/ui/cardMeta";

/**
 * What the cohort figures cover, and the two ways they overstate cover.
 *
 * Both caveats are load-bearing and neither is visible from the numbers:
 *
 * - **all history** — an anonymity set is every withdrawal of that denomination
 *   the pool has ever seen, so this card ignores the range the rest of the page
 *   is filtered to. Unsaid, a reader takes these counts for the selected window
 *   and reads every k as far smaller than it is.
 * - **at most, not exactly** — k counts withdrawals, and one person exiting
 *   repeatedly at one denomination is indistinguishable here from that many
 *   separate users. k bounds cover from above; it is not a headcount.
 *
 * `meta.test.ts` asserts both phrases survive. They are the only place either is
 * stated at card level, and prose with no test rots silently.
 */
export function anonymityMeta(sets: AnonymitySet[] | null): CardMeta {
  if (!sets) return LOADING;
  if (sets.length === 0) return { lead: "no denominations recorded" };
  // `coverTone` owns what "thin" means; THIN_SET is only the number to print.
  const thin = sets.filter((s) => coverTone(s.count) !== "counted").length;
  const dormant = sets.filter(isDormant).length;
  return {
    lead: plural(sets.length, "denomination"),
    basis: "all history · at most, not exactly",
    gaps: gapList(
      thin > 0 && `${thin} below k=${THIN_SET}`,
      // Only counted over cohorts that actually reported a window; a backend
      // that sent none contributes no dormancy claim rather than "all dormant".
      dormant > 0 && `${dormant} dormant in ${fmtBucket(RECENT_WINDOW_SEC)}`,
    ),
  };
}
