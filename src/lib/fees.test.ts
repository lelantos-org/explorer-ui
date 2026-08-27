import { describe, expect, it } from "vitest";
import { feeDisplay, hasUnknownFee } from "./fees";

describe("feeDisplay", () => {
  /**
   * The distinction the per-asset fee model rests on: with no global rate to
   * inherit, an absent value is unknown and a zero is deliberate.
   */
  it("separates an unknown rate from a zero one", () => {
    expect(feeDisplay(null).state).toBe("unknown");
    expect(feeDisplay(0).state).toBe("free");
    expect(feeDisplay(null).text).not.toBe(feeDisplay(0).text);
  });

  it("never prints a number for an unknown rate", () => {
    expect(feeDisplay(null).text).toBe("—");
  });

  it("renders the rates the registry actually carries", () => {
    expect(feeDisplay(20).text).toBe("0.2%");
    expect(feeDisplay(25).text).toBe("0.25%");
    expect(feeDisplay(2000).text).toBe("20%");
  });

  // 20 and 25 bps are both deployed, so rounding them together would make the
  // column useless exactly where it is read.
  it("keeps 20 and 25 bps distinguishable", () => {
    expect(feeDisplay(20).text).not.toBe(feeDisplay(25).text);
  });

  it("carries the exact bps in the tooltip", () => {
    expect(feeDisplay(25).title).toContain("25 bps");
  });

  it("marks any non-zero rate as charged", () => {
    expect(feeDisplay(1).state).toBe("charged");
    expect(feeDisplay(2000).state).toBe("charged");
  });
});

describe("hasUnknownFee", () => {
  it("is false once both legs are indexed, including at zero", () => {
    expect(hasUnknownFee({ depositBps: 0, withdrawBps: 0 })).toBe(false);
    expect(hasUnknownFee({ depositBps: 0, withdrawBps: 20 })).toBe(false);
  });

  it("is true when either leg is missing", () => {
    expect(hasUnknownFee({ depositBps: null, withdrawBps: 20 })).toBe(true);
    expect(hasUnknownFee({ depositBps: 0, withdrawBps: null })).toBe(true);
    expect(hasUnknownFee({ depositBps: null, withdrawBps: null })).toBe(true);
  });
});
