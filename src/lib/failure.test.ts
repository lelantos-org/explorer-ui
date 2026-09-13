import { describe, expect, it } from "vitest";
import { describeFailure } from "./failure";

describe("describeFailure", () => {
  it("reads a server error as the explorer's trouble, not the reader's", () => {
    const f = describeFailure("500 Internal Server Error");
    expect(f.headline).toBe("the explorer is having trouble right now");
    expect(f.hint).toContain("on its own");
  });

  it("treats rate limiting like an outage", () => {
    expect(describeFailure("429 Too Many Requests").headline).toBe(
      describeFailure("503 Service Unavailable").headline,
    );
  });

  it("recognises every engine's network failure as being offline", () => {
    for (const raw of [
      "Failed to fetch",
      "fetch failed",
      "NetworkError when attempting to fetch resource.",
      "Load failed",
    ]) {
      expect(describeFailure(raw).headline).toBe("can't reach the explorer");
    }
  });

  it("never shows the status code or transport text", () => {
    for (const raw of ["500 Internal Server Error", "404 Not Found", "Failed to fetch", "boom"]) {
      const { headline, hint } = describeFailure(raw);
      expect(`${headline} ${hint}`).not.toMatch(/\d{3}|internal|fetch|boom/i);
    }
  });
});
