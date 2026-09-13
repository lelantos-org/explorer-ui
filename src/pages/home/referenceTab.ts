import { useUrlChoice } from "@/hooks/useUrlState";

/**
 * Which group of reference cards is on show.
 *
 * Two of the page's sections are the reason it exists — the flows, and how much
 * cover a withdrawal actually has. The rest are lookups: what moved lately,
 * what the pool accepts, what moved where, what it is holding. Stacked at equal
 * weight those lookups read as more headlines and left the two findings to be
 * scrolled past, so they are grouped by the question each one answers and shown
 * a group at a time.
 *
 * Grouped rather than cut: every card is still one click away, and the choice
 * lives in the URL beside the filters so a shared link lands on the same view.
 */
const REFERENCE_TABS = ["activity", "assets", "chains", "pool"] as const;
export type ReferenceTab = (typeof REFERENCE_TABS)[number];

/** Defaults to the feed: it is the only group that changes minute to minute,
 *  and the other three are consulted rather than watched. */
const DEFAULT_TAB: ReferenceTab = "activity";

/** The chosen tab, held in `?tab=`. */
export function useReferenceTab() {
  return useUrlChoice<ReferenceTab>("tab", REFERENCE_TABS, DEFAULT_TAB);
}
