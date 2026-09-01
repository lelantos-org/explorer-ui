import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LockedByChain from "../home/LockedByChain";
import Card from "./Card";

describe("Card", () => {
  it("renders its children and header aside when nothing failed", () => {
    const html = renderToString(
      <Card title="escrowed by chain" meta={<span>3 chains</span>}>
        <p>body</p>
      </Card>,
    );

    expect(html).toContain("body");
    expect(html).toContain("3 chains");
    expect(html).not.toContain("could not load this");
  });

  it("replaces the body with the failure, and says it will retry", () => {
    const html = renderToString(
      <Card title="escrowed by chain" error="503 service unavailable">
        <p>body</p>
      </Card>,
    );

    expect(html).toContain("could not load this");
    expect(html).toContain("503 service unavailable");
    expect(html).toContain("retrying every 30s");
    expect(html).not.toContain("body");
  });

  it("drops the meta when the request failed", () => {
    // The meta summarises the very data that did not arrive, so leaving it up
    // would put a confident-looking figure beside the failure.
    const html = renderToString(
      <Card title="escrowed by chain" meta={<span>3 chains</span>} error="offline">
        <p>body</p>
      </Card>,
    );

    expect(html).not.toContain("3 chains");
  });

  /// The bug this whole prop exists for. `LockedByChain` reports a null `data`
  /// as "nothing escrowed yet" — a statement about the pool. With the backend
  /// unreachable `data` is also null, so the explorer asserted the pool was
  /// empty when it simply could not ask. `useAsync` returns an `error`
  /// precisely so those two are distinguishable; the page was dropping it.
  it("does not let a failed request read as an empty pool", () => {
    const failed = renderToString(
      <Card title="escrowed by chain" error="fetch failed">
        <LockedByChain data={null} loading={false} selected={null} onSelect={() => {}} />
      </Card>,
    );
    const genuinelyEmpty = renderToString(
      <Card title="escrowed by chain">
        <LockedByChain data={[]} loading={false} selected={null} onSelect={() => {}} />
      </Card>,
    );

    expect(failed).not.toContain("nothing escrowed yet");
    expect(failed).toContain("fetch failed");
    // The honest empty case is untouched — it still gets to say the pool is empty.
    expect(genuinelyEmpty).toContain("nothing escrowed yet");
  });
});
