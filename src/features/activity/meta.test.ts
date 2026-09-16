import { describe, expect, it } from "vitest";
import { LOADING_TEXT, txRow } from "@/test/fixtures";
import { activityMeta } from "./meta";

describe("activityMeta", () => {
  it("says the feed spans every chain, whatever the page is scoped to", () => {
    expect(activityMeta([txRow("deposit"), txRow("withdraw")]).lead).toBe(
      "2 most recent · every chain",
    );
  });

  it("waits rather than counting rows it does not have", () => {
    expect(activityMeta(null).lead).toBe(LOADING_TEXT);
  });
});
