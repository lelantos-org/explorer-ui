import { describe, expect, it } from "vitest";
import { renderHtml } from "@/test/render";
import Card from "@/ui/Card";
import LockedByChain from "./LockedByChain";

describe("LockedByChain inside its card", () => {
  /// The bug this whole prop exists for. `LockedByChain` reports a null `data`
  /// as "nothing escrowed yet" — a statement about the pool. With the backend
  /// unreachable `data` is also null, so the explorer asserted the pool was
  /// empty when it simply could not ask. `useAsync` returns an `error`
  /// precisely so those two are distinguishable; the page was dropping it.
  it("does not let a failed request read as an empty pool", () => {
    const failed = renderHtml(
      <Card title="escrowed by chain" error="fetch failed">
        <LockedByChain data={null} loading={false} selected={null} onSelect={() => {}} />
      </Card>,
    );
    const genuinelyEmpty = renderHtml(
      <Card title="escrowed by chain">
        <LockedByChain data={[]} loading={false} selected={null} onSelect={() => {}} />
      </Card>,
    );

    expect(failed).not.toContain("nothing escrowed yet");
    expect(failed).toContain("reach the explorer");
    // The honest empty case is untouched — it still gets to say the pool is empty.
    expect(genuinelyEmpty).toContain("nothing escrowed yet");
  });
});
