/**
 * Join class names, dropping the falsy ones.
 *
 * So a conditional modifier is written as `cx("row", on && "row--on")` rather
 * than a template string that leaves a trailing space — or a stray "false" —
 * in the DOM whenever the condition does not hold.
 */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
