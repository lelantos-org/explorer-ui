import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

describe("Wordmark", () => {
  it("links back to the main page", () => {
    const html = renderToString(<Wordmark />);
    expect(html).toMatch(/^<a href="\/" class="brand" aria-label="Lelantos Explorer home">/);
    expect(html).toContain("LELANTOS");
  });
});
