import { describe, expect, it } from "vitest";
import { txRow } from "@/test/fixtures";
import { FEED_LIMIT, nextFeedLimit, txRowKey } from "./feed";

describe("txRowKey", () => {
  it("tells apart operations of one kind bundled into one transaction", () => {
    const a = txRow("withdraw", { logIndex: 3 });
    const b = txRow("withdraw", { logIndex: 4 });
    expect(txRowKey(a)).not.toBe(txRowKey(b));
  });

  it("tells apart kinds sharing a hash and a log index", () => {
    expect(txRowKey(txRow("deposit"))).not.toBe(txRowKey(txRow("withdraw")));
  });
});

describe("nextFeedLimit", () => {
  it("steps up while the feed fills its limit", () => {
    expect(nextFeedLimit(FEED_LIMIT, FEED_LIMIT)).toBe(50);
    expect(nextFeedLimit(50, 50)).toBe(100);
  });

  it("offers nothing past the last step", () => {
    expect(nextFeedLimit(100, 100)).toBeNull();
  });

  it("offers nothing when the feed came back short", () => {
    expect(nextFeedLimit(FEED_LIMIT, FEED_LIMIT - 1)).toBeNull();
  });
});
