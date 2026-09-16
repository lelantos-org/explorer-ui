import { describe, expect, it } from "vitest";
import { renderHtml } from "@/test/render";
import Wordmark from "./Wordmark";

describe("Wordmark", () => {
  it("links back to the main page", () => {
    const html = renderHtml(<Wordmark />);
    expect(html).toMatch(/^<a href="\/" class="brand" aria-label="Lelantos Explorer home">/);
    expect(html).toContain("LELANTOS");
  });
});
