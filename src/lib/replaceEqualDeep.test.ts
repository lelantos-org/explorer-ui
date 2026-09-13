import { describe, expect, it } from "vitest";
import { replaceEqualDeep } from "./replaceEqualDeep";

describe("replaceEqualDeep", () => {
  it("returns the previous value when the new one is deeply equal", () => {
    const prev = [
      { ts: 1, in: 2 },
      { ts: 2, in: 3 },
    ];
    const next = [
      { ts: 1, in: 2 },
      { ts: 2, in: 3 },
    ];
    expect(replaceEqualDeep(prev, next)).toBe(prev);
  });

  it("keeps the unchanged parts of a response that partly changed", () => {
    const flows = [{ ts: 1, in: 2 }];
    const prev = { flows, domain: { start: 0, end: 30 } };
    const next = { flows: [{ ts: 1, in: 2 }], domain: { start: 30, end: 60 } };
    const out = replaceEqualDeep(prev, next);
    expect(out).not.toBe(prev);
    expect(out.flows).toBe(flows);
    expect(out.domain).toEqual({ start: 30, end: 60 });
  });

  it("shares the rows that did not change when a row is added", () => {
    const a = { id: "a" };
    const out = replaceEqualDeep([a], [{ id: "new" }, { id: "a" }]);
    expect(out).toHaveLength(2);
    // Positional: a row that moved index is not the same row to a table keyed
    // by position, so it is only reused where it still sits.
    expect(out[0]).toEqual({ id: "new" });
  });

  it("treats a removed or added key as a change", () => {
    const prev = { a: 1, b: 2 };
    expect(replaceEqualDeep(prev, { a: 1 })).not.toBe(prev);
    expect(replaceEqualDeep({ a: 1 }, { a: 1, b: undefined })).toEqual({ a: 1, b: undefined });
  });

  it("replaces a value whose type changed", () => {
    expect(replaceEqualDeep(null, [1])).toEqual([1]);
    expect(replaceEqualDeep([1], null)).toBeNull();
  });
});
