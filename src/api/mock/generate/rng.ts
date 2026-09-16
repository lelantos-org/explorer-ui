/**
 * Seeded randomness for the mock's synthetic history.
 *
 * Every generator under `generate/` is pure given an `Rng`, so a seed
 * reproduces the whole dataset exactly. None of them knows about the
 * `ExplorerApi` surface — they only produce the rows `endpoints/` query over.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hex(rng: Rng, bytes: number): string {
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += Math.floor(rng() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return s;
}

/** Box-Muller gaussian, mean 0 std 1. */
export function gauss(rng: Rng): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Pick from a non-empty list by wrapping index — total, and without a cast:
 *  index 0 of a non-empty tuple is always present. */
export const cycle = <T>(list: readonly [T, ...T[]], i: number): T =>
  list[i % list.length] ?? list[0];
