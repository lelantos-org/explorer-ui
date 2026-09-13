const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;

/**
 * `next`, reusing every part of `prev` that is deeply equal to it.
 *
 * A poll that returns the same rows as the last one then hands back the very
 * same array, so a memoised table or chart below it sees an unchanged prop and
 * skips its render. And where only part of a response changed — one new row in
 * a feed, a window that slid by 30 seconds — the untouched parts keep their
 * identity, so only what actually moved re-renders.
 *
 * JSON-shaped data only (plain objects, arrays, primitives), which is all the
 * API returns. Anything else is compared by identity.
 */
export function replaceEqualDeep<T>(prev: unknown, next: T): T {
  if (Object.is(prev, next)) return prev as T;

  if (Array.isArray(prev) && Array.isArray(next)) {
    let same = prev.length === next.length;
    const out = next.map((item, i) => {
      const shared = replaceEqualDeep(prev[i], item);
      if (shared !== prev[i]) same = false;
      return shared;
    });
    return (same ? prev : out) as T;
  }

  if (isPlainObject(prev) && isPlainObject(next)) {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    let same = prevKeys.length === nextKeys.length;
    const out: Record<string, unknown> = {};
    for (const key of nextKeys) {
      const shared = replaceEqualDeep(prev[key], next[key]);
      if (!(key in prev) || shared !== prev[key]) same = false;
      out[key] = shared;
    }
    return (same ? prev : out) as T;
  }

  return next;
}
