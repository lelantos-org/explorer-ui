/**
 * Indexing helpers for tests.
 *
 * Under `noUncheckedIndexedAccess` every `rows[0]` is `T | undefined`, and a
 * test that reaches through it with `!` or `?.` reports the eventual mismatch
 * rather than the missing row. These throw at the index instead, so a query
 * that came back short says so on the line that asked for it.
 */

export function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) {
    throw new Error(`expected an element at index ${index}, but length is ${list.length}`);
  }
  return value;
}

/** The first element, which is what most of these assertions actually want. */
export const first = <T>(list: readonly T[]): T => at(list, 0);
