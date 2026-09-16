import { describe, expect, it } from "vitest";
import { renderHtml } from "@/test/render";
import Card from "./Card";

describe("Card", () => {
  it("renders its children and header aside when nothing failed", () => {
    const html = renderHtml(
      <Card title="escrowed by chain" meta={<span>3 chains</span>}>
        <p>body</p>
      </Card>,
    );

    expect(html).toContain("body");
    expect(html).toContain("3 chains");
    expect(html).not.toContain('role="status"');
  });

  it("replaces the body with the failure in plain words, and says it recovers", () => {
    const html = renderHtml(
      <Card title="escrowed by chain" error="500 Internal Server Error">
        <p>body</p>
      </Card>,
    );

    expect(html).toContain("the explorer is having trouble right now");
    expect(html).toContain("on its own");
    expect(html).not.toContain("body");
  });

  it("keeps the raw error off the page, on hover only", () => {
    const html = renderHtml(
      <Card title="escrowed by chain" error="500 Internal Server Error">
        <p>body</p>
      </Card>,
    );

    expect(html).toContain('title="500 Internal Server Error"');
    expect(html.match(/500 Internal Server Error/g)).toHaveLength(1);
  });

  it("drops the meta when the request failed", () => {
    // The meta summarises the very data that did not arrive, so leaving it up
    // would put a confident-looking figure beside the failure.
    const html = renderHtml(
      <Card title="escrowed by chain" meta={<span>3 chains</span>} error="offline">
        <p>body</p>
      </Card>,
    );

    expect(html).not.toContain("3 chains");
  });
});
