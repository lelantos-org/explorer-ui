import { describe, expect, it } from "vitest";
import { txRow } from "@/test/fixtures";
import { txRowKey } from "./feed";

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
