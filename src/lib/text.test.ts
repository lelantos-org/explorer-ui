import { describe, expect, it } from "vitest";
import { joinMeta, plural } from "./text";

describe("joinMeta", () => {
  it("joins the parts a caller kept", () => {
    expect(joinMeta(["bucket 1h", "all assets"])).toBe("bucket 1h · all assets");
  });

  it("drops absent parts instead of leaving a dangling separator", () => {
    expect(joinMeta(["USD · at spot", undefined, null, false, ""])).toBe("USD · at spot");
  });

  it("has nothing to say about nothing", () => {
    expect(joinMeta([])).toBe("");
  });
});

describe("plural", () => {
  it("agrees with its count", () => {
    expect(plural(1, "asset")).toBe("1 asset");
    expect(plural(2, "asset")).toBe("2 assets");
    expect(plural(0, "asset")).toBe("0 assets");
  });

  // Counts share the thousands separator the rest of the UI uses, so a large
  // registry does not read as a different kind of number.
  it("groups a large count", () => {
    expect(plural(1234, "chain")).toBe("1,234 chains");
  });
});
