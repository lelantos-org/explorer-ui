import { describe, expect, it } from "vitest";
import { fmtAge, fmtBucket, fmtTs, fmtUtc, isOpenBucket } from "./time";

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

  it("prints the full UTC instant", () => {
    expect(fmtUtc(Date.UTC(2026, 2, 14, 9, 30, 5) / 1000)).toBe("2026-03-14 09:30:05 UTC");
  });

  it("names buckets in hours or days", () => {
    expect(fmtBucket(3600)).toBe("1h");
    expect(fmtBucket(6 * 3600)).toBe("6h");
    expect(fmtBucket(86400)).toBe("1d");
  });
});

describe("isOpenBucket", () => {
  const domain = { start: 0, end: 1000 };

  it("is open while the window ends inside the bucket", () => {
    expect(isOpenBucket(900, 200, domain)).toBe(true);
  });

  it("is closed once the bucket has fully elapsed", () => {
    expect(isOpenBucket(700, 200, domain)).toBe(false);
    // Ends exactly with the window: nothing more can land in it.
    expect(isOpenBucket(800, 200, domain)).toBe(false);
  });

  it("is never open without a window to end in", () => {
    expect(isOpenBucket(900, 200, null)).toBe(false);
  });
});
