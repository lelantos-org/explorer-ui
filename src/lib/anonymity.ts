/**
 * How much cover a transaction actually got.
 *
 * A withdrawal publishes exactly one integer, its `publicOut`, so its anonymity
 * set is every other withdrawal that published the same one. See
 * `docs/src/guide/denominations.md`: the set is *actual, not potential* — it is
 * however many users withdrew that denomination, not however many could have.
 *
 * Everything here is a pure function of already-loaded data, so what a row
 * claims can be tested without rendering it.
 */
import type { AnonymitySet, TxOut } from "../api";

/**
 * Below this many withdrawals, a denomination is called thin.
 *
 * A display threshold chosen for this UI, not a protocol value: nothing on
 * chain treats 9 differently from 10. It exists so a cohort that is technically
 * more than one, but still small enough to enumerate by hand, does not render
 * with the same confidence as a busy rung.
 */
export const THIN_SET = 10;

/**
 * The lookback behind every "recent" figure on the cohort card.
 *
 * Lives here rather than beside the query because the request and the label
 * that names it have to agree: a constant in the hook and a "30d" written into
 * a caption are the same number in two places, and the first time either moves
 * the card starts lying. `fmtBucket` renders it, so the label is derived too.
 *
 * Deliberately not the page's range selector. `count` is all-history by
 * definition, and a recency figure that followed the range would read as though
 * the whole card did.
 */
export const RECENT_WINDOW_SEC = 30 * 86_400;

/**
 * How many cohorts the card asks for.
 *
 * Lives here, like the window, because the interpretation depends on it: a
 * response *at* the cap may have been truncated, and a denomination missing
 * from a truncated list means something different from one missing from a
 * complete one.
 */
export const COHORT_LIMIT = 1000;

/**
 * How much cover a cohort of a given size provides.
 *
 * - `counted` — a real cohort, at or above `THIN_SET`.
 * - `thin` — more than one, but small enough to enumerate by hand.
 * - `unique` — a cohort of one. No cover: the amount links this withdrawal to
 *   the deposit that funded it.
 */
export type CoverTone = "counted" | "thin" | "unique";

/**
 * What a row's privacy cell says, and how strongly: a cohort's own reading, or
 * `unknown` when the withdrawal has a denomination the cohort table cannot
 * size. Never a cohort of zero.
 */
export type PrivacyTone = CoverTone | "unknown";

/**
 * Which reading a cohort size gets.
 *
 * The feed's privacy column and the cohort card both need this, and a UI where
 * a row reads "thin" beside a bar coloured as healthy would be worse than
 * either alone — so the decision lives here once rather than in each of them.
 */
export function coverTone(count: number): CoverTone {
  if (count <= 1) return "unique";
  return count < THIN_SET ? "thin" : "counted";
}

/**
 * Whether a cohort has seen any activity inside the requested window.
 *
 * Reported alongside the tone rather than folded into it. A dormant cohort's
 * `count` is real and the definition of an anonymity set is all-history, so a
 * busy-but-old denomination is not thin — it is busy and old, and saying so
 * takes two facts rather than one relabelled one.
 *
 * A `null` recency is unknown, not dormant: a backend too old to report the
 * window has not told us the cohort went quiet, and saying it did would invent
 * a finding.
 */
export const isDormant = (set: AnonymitySet): boolean => set.recentCount === 0;

/**
 * How a cohort size reads.
 *
 * A bare "k = 1" looks like a small number on a scale. It is not on the scale:
 * it means no cover at all, so it is named rather than counted. Larger counts
 * are exact rather than abbreviated — `fmtNum` would render 1234 as "1.2k",
 * both the wrong convention for a count of things and a confusing second "k".
 */
export function kLabel(count: number): string {
  return count <= 1 ? "k = 1 · unique" : `k = ${count.toLocaleString()}`;
}

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

/** Cohorts smallest first, so the thinnest sets — the ones worth acting on —
 *  lead. Ties break on the denomination so the order is stable between
 *  requests, comparing numerically since "1000" sorts below "200" as text. */
export function thinnestFirst(a: AnonymitySet, b: AnonymitySet): number {
  return a.count - b.count || Number(a.publicOut) - Number(b.publicOut);
}
