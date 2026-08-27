import { describe, expect, it } from "vitest";
import {
  fmtAge,
  fmtBucket,
  fmtNum,
  fmtTokens,
  fmtTs,
  fmtUsd,
  fmtUsdSigned,
  joinMeta,
  plural,
} from "./format";

describe("fmtNum", () => {
  it("climbs the k/M/B/T ladder", () => {
    expect(fmtNum(999)).toBe("999");
    expect(fmtNum(1_500)).toBe("1.5k");
    expect(fmtNum(2_500_000)).toBe("2.50M");
    expect(fmtNum(3_100_000_000)).toBe("3.10B");
  });

  it("switches to exponent form past the readable range", () => {
    expect(fmtNum(1.8e19)).toBe("1.80e19");
  });

  it("keeps the sign", () => {
    expect(fmtNum(-1_500)).toBe("-1.5k");
  });
});

describe("fmtTokens", () => {
  it("keeps real decimals below 1000, where the ladder would round them away", () => {
    // The ladder would print these as "2" and "0".
    expect(fmtTokens(1.5)).toBe("1.5");
    expect(fmtTokens(0.0125)).toBe("0.0125");
  });

  it("hands large amounts back to the ladder", () => {
    expect(fmtTokens(12_500)).toBe("12.5k");
  });

  it("prints an exact zero plainly", () => {
    expect(fmtTokens(0)).toBe("0");
  });
});

describe("fmtUsd", () => {
  it("keeps cents below 1k, where whole dollars would hide the difference", () => {
    expect(fmtUsd(4.99)).toBe("$4.99");
    expect(fmtUsd(5)).toBe("$5.00");
  });

  it("uses the ladder above 1k", () => {
    expect(fmtUsd(26_400)).toBe("$26.4k");
  });

  it("marks direction on signed figures", () => {
    expect(fmtUsdSigned(5)).toBe("+$5.00");
    expect(fmtUsdSigned(-5)).toBe("−$5.00");
  });
});

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
