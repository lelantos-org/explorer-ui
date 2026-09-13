import { describe, expect, it } from "vitest";
import { indexerState } from "./indexerState";

describe("indexerState", () => {
  it("waits for a first answer before calling the indexer live", () => {
    expect(indexerState({ data: null, error: null })).toBe("connecting");
    expect(indexerState({ data: [], error: null })).toBe("live");
  });

  /**
   * The distinction `useAsync` exists for: figures from an earlier poll are
   * still figures, and a page with none at all is a different failure.
   */
  it("tells a failed refresh apart from a backend that never answered", () => {
    expect(indexerState({ data: [], error: "503" })).toBe("stale");
    expect(indexerState({ data: null, error: "503" })).toBe("down");
  });
});
