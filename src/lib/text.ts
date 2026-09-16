/**
 * `"1 asset"` / `"3 assets"` — the count and its noun, agreeing.
 *
 * Every caller was spelling out the same ternary, and each one is a place the
 * two can disagree. English `-s` only: every noun the UI counts takes it, and a
 * table of irregulars would be more machinery than the problem.
 */
export function plural(count: number, noun: string): string {
  // Grouped, not abbreviated: `fmtNum` would render 1234 as "1.2k", and a
  // count of things is read for its exact value where a magnitude is not.
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * The one separator for card metadata, tile units and any other line that names
 * several facts about a figure. Absent parts drop out rather than leaving a
 * dangling separator, so callers can pass a conditional straight in.
 */
export function joinMeta(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}
