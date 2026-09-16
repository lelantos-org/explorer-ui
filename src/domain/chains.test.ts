import { describe, expect, it } from "vitest";
import { getChainMeta, getTokenUrl, getTxUrl } from "./chains";

const USDC_BASE = "833589fcd6edb6e08f4c7c32d4f71b54bda02913";

describe("getChainMeta", () => {
  it("names a known chain", () => {
    expect(getChainMeta(8453).name).toBe("Base");
  });

  // An unknown chain is a registry the UI has not been taught about, not an
  // error: it still has to render as something identifiable.
  it("falls back to the id for an unknown chain", () => {
    const meta = getChainMeta(9999);
    expect(meta.name).toContain("9999");
    expect(meta.short).toContain("9999");
    expect(meta.explorer).toBeUndefined();
  });
});

describe("explorer links", () => {
  it("builds a token url", () => {
    expect(getTokenUrl(8453, USDC_BASE)).toBe(`https://basescan.org/token/0x${USDC_BASE}`);
  });

  it("builds a tx url", () => {
    expect(getTxUrl(1, "abc")).toBe("https://etherscan.io/tx/0xabc");
  });

  it("prefixes a value that arrives without 0x", () => {
    expect(getTokenUrl(1, USDC_BASE)).toContain("/0x8335");
  });

  // A local node has no explorer, so the caller renders plain text rather than
  // a link into nowhere.
  it("returns null for a chain with no explorer", () => {
    expect(getTokenUrl(31337, USDC_BASE)).toBeNull();
    expect(getTxUrl(31337, "abc")).toBeNull();
  });

  it("returns null for an unknown chain", () => {
    expect(getTokenUrl(9999, USDC_BASE)).toBeNull();
  });
});
