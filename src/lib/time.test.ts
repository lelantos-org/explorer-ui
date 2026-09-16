import { describe, expect, it } from "vitest";
import { fmtAge, fmtBucket, fmtTs } from "./time";

describe("time formatting", () => {
  it("shows clock time for short spans and dates for long ones", () => {
    const ts = Date.UTC(2026, 2, 14, 9, 30) / 1000;
    expect(fmtTs(ts, 86400)).toBe("09:30");
    expect(fmtTs(ts, 30 * 86400)).toBe("03-14");
  });

  it("ages to the coarsest unit that fits", () => {
    const now = 1_000_000;
    expect(fmtAge(now - 30, now)).toBe("30s");
    expect(fmtAge(now - 120, now)).toBe("2m");
    expect(fmtAge(now - 7200, now)).toBe("2h");
    expect(fmtAge(now - 3 * 86400, now)).toBe("3d");
  });

  it("never reports a negative age for a clock-skewed block", () => {
    expect(fmtAge(1_000_100, 1_000_000)).toBe("0s");
  });

  it("names buckets in hours or days", () => {
    expect(fmtBucket(3600)).toBe("1h");
    expect(fmtBucket(6 * 3600)).toBe("6h");
    expect(fmtBucket(86400)).toBe("1d");
  });
});
