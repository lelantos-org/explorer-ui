/**
 * What cover one transaction in the feed got.
 *
 * The feed and the cohort table are separate requests, so a row is joined
 * against the cohorts here — and the join has to say "unknown" in every case
 * where the table cannot actually answer, rather than guessing a k.
 */
import type { AnonymitySet, TxOut } from "@/api/types";
import { COHORT_LIMIT, type CoverTone, coverTone, isDormant, kLabel } from "./cover";

/**
 * What a row's privacy cell says, and how strongly: a cohort's own reading, or
 * `unknown` when the withdrawal has a denomination the cohort table cannot
 * size. Never a cohort of zero.
 */
export type PrivacyTone = CoverTone | "unknown";

export interface TxPrivacy {
  tone: PrivacyTone;
  /** Short cell text. */
  label: string;
  /** The `title` attribute — why the label says what it says. */
  title: string;
  /** The cohort size, when one is known. `null` is unknown, never zero. */
  k: number | null;
}

/** `k` defaults to unknown, which is what every non-cohort case reports. */
const privacy = (
  tone: PrivacyTone,
  label: string,
  title: string,
  k: number | null = null,
): TxPrivacy => ({ tone, label, title, k });

/** The identity a cohort is keyed by. An asset id is unique only within its
 *  chain, and a denomination only within its asset. */
export const cohortKey = (chainId: number, assetIdU64: number, publicOut: string): string =>
  `${chainId}:${assetIdU64}:${publicOut}`;

/**
 * The cohort table as the feed consumes it.
 *
 * Carries whether the list was complete, because a lookup that misses means two
 * different things. The cohorts and the feed are separate requests on separate
 * caches, so a withdrawal can reach the feed before the cohort snapshot that
 * would contain it — and that is not the same as not knowing its size.
 */
export interface Cohorts {
  byKey: Map<string, AnonymitySet>;
  /**
   * Whether the whole cohort table is in hand.
   *
   * False while it is still loading and false at the row cap, since a response
   * *at* the cap may have been cut short. Both cases have to read as unknown; a
   * miss only means "newer than our data" when the list was complete.
   */
  complete: boolean;
}

/**
 * Index cohorts for lookup by the feed.
 *
 * Keyed to the whole cohort rather than to its `count`: the feed's tooltip
 * reports recency too, and a second lookup structure for it could fall out of
 * step with this one.
 */
export function indexCohorts(sets: AnonymitySet[] | null): Cohorts {
  const byKey = new Map<string, AnonymitySet>();
  for (const s of sets ?? []) {
    byKey.set(cohortKey(s.chainId, s.assetIdU64, s.publicOut), s);
  }
  return { byKey, complete: sets !== null && sets.length < COHORT_LIMIT };
}

/**
 * What cover one withdrawal got, or `null` for a kind the question does not
 * apply to.
 *
 * Only a withdrawal publishes a denomination, so only a withdrawal has a k. The
 * other kinds are not private-by-a-different-measure — there is simply no
 * anonymity set to report, and scoring them on this axis would put a verdict
 * where there is no measurement.
 */
export function txPrivacy(tx: TxOut, cohorts: Cohorts): TxPrivacy | null {
  if (tx.kind !== "withdraw" || tx.assetIdU64 === null) return null;

  // Indexed before the contract emitted `publicOut`. Unknown, which is not the
  // same as a cohort of nothing.
  if (tx.publicOut === null) {
    return privacy(
      "unknown",
      "not indexed",
      "This withdrawal's denomination was not recorded, so its cohort is unknown.",
    );
  }

  const cohort = cohorts.byKey.get(cohortKey(tx.chainId, tx.assetIdU64, tx.publicOut));
  if (cohort === undefined) {
    // A complete list that lacks this denomination cannot be missing it: the
    // withdrawal in front of us publishes it, so the cohort is at least one and
    // the table is simply older than this row. The two feeds are polled
    // separately, so a new denomination reaches the feed first and resolves on
    // the next refresh.
    //
    // Still muted rather than toned as a finding. `k >= 1` is all we can prove,
    // and calling a row unique on a stale snapshot would raise an alarm that a
    // busy minute could disprove a moment later.
    if (cohorts.complete) {
      return privacy(
        "unknown",
        "k ≥ 1",
        "Newer than the cohort table, which is fetched separately. Its size resolves on the next refresh.",
      );
    }
    // Truncated, or not loaded yet. Nothing can be said about the size at all.
    return privacy(
      "unknown",
      "not counted",
      "The cohort table did not include this denomination, so its size is unknown.",
    );
  }

  const k = cohort.count;
  const title = [coverTitle(k), recencyNote(cohort)].filter(Boolean).join(" ");
  return privacy(coverTone(k), kLabel(k), title, k);
}

/** The recency half of a cohort's tooltip. The cell itself has no room for it,
 *  and a dormant set is the case worth spelling out rather than implying.
 *  Empty when recency is unknown, so the tooltip simply stops rather than
 *  reporting a window the backend never measured. */
function recencyNote(cohort: AnonymitySet): string {
  if (cohort.recentCount === null) return "";
  return isDormant(cohort)
    ? "None of them are recent, so this denomination is dormant."
    : `${cohort.recentCount} of them are recent.`;
}

/** Why a cohort reads the way it does. Split from `txPrivacy` so the branch
 *  that has a k reads as one line rather than a nested ternary. */
function coverTitle(k: number): string {
  switch (coverTone(k)) {
    // The one exact reading on the page. Every other k bounds the number of
    // distinct users from above; one withdrawal means at most one user and at
    // least one, so here the bound is the value.
    case "unique":
      return "No other withdrawal has published this amount. A unique publicOut is linkable to the deposit that funded it.";
    case "thin":
      return `Only ${k} withdrawals have published this amount — at most ${k} people, and fewer if any of them withdrew more than once.`;
    case "counted":
      return `${k} withdrawals have published this amount — at most ${k} people, since one person withdrawing repeatedly counts once per withdrawal.`;
  }
}
