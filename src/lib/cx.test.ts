import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins the names that are set", () => {
    expect(cx("row", "row--on")).toBe("row row--on");
  });

  it("drops a condition that does not hold instead of printing it", () => {
    const on = false;
    expect(cx("row", on && "row--on", null, undefined, "")).toBe("row");
  });
});
