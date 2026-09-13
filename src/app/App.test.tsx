import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiProvider, createMockApi } from "@/api";
import App from "./App";

/**
 * A render smoke test: it wires the real component tree over the mock backend
 * and asserts the first paint — the state every screen shows before any request
 * resolves. Effects do not run under `renderToString`, so this covers the
 * loading and empty paths rather than the populated ones, which is exactly
 * where a broken import or a null-handling slip would surface.
 */
const render = () =>
  renderToString(
    <ApiProvider api={createMockApi({ latencyMs: 0 })}>
      <App />
    </ApiProvider>,
  )
    // React separates adjacent text nodes with an empty comment, which would
    // otherwise split every interpolated phrase in the assertions below.
    .replaceAll("<!-- -->", "");

describe("App", () => {
  it("renders the shell", () => {
    const html = render();
    expect(html).toContain("LELANTOS");
    expect(html).toContain("network observability");
  });

  it("leads with the two sections that are findings rather than lookups", () => {
    const html = render();
    for (const title of ["Inflow and outflow", "How much cover each amount actually has"]) {
      expect(html).toContain(title);
    }
  });

  /**
   * The lookup cards sit behind a tab strip, so only one group renders at a
   * time — the strip is what makes the other three reachable, and a card whose
   * tab has lost its label is unreachable without being deleted.
   */
  it("reaches every other card through the tab strip", () => {
    const html = render();
    // The default tab, rendered. "Transactions by kind" is no longer behind
    // the strip: it follows the page's scope and range, so it sits with the
    // flows.
    expect(html).toContain("Latest transactions");
    // The rest, one click away. Matched as whole button labels: "assets" and
    // "chains" are ordinary words on this page, and a substring of the hero or
    // the scope picker would pass this test with the strip deleted.
    expect(html).toContain('aria-label="reference cards"');
    for (const tab of ["Assets", "Chains", "In the pool"]) {
      expect(html).toContain(`>${tab}</button>`);
    }
  });

  /**
   * A protocol term dropped rather than demoted leaves whoever came from the
   * docs searching a page that no longer uses their word.
   */
  it("keeps the protocol term beside the plain name it now leads with", () => {
    const html = render();
    expect(html).toContain("anonymity sets");
  });

  it("shows placeholders rather than zero before anything has resolved", () => {
    const html = render();
    // A 0 here would be a measurement the backend never made. The figures are
    // placeholder bars, announced as busy, with the word kept for a screen
    // reader.
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("sk__bar");
    expect(html).toContain("loading…");
    expect(html).not.toMatch(/stat__val[^>]*>0</);
  });

  /**
   * Every card that loads has to hold its place while it does: a bare "no
   * data" in a chart card is a finding about the pool, and it jumped the page
   * when the plot replaced it.
   */
  it("draws the charts' placeholders, not an empty state, while they load", () => {
    const html = render();
    expect(html).toContain("chart-sk");
    expect(html).not.toContain("no data");
    expect(html).not.toContain("no common unit");
  });

  it("defaults to the 30d range with no query string", () => {
    expect(render()).toContain("net flow · 30d");
  });

  /**
   * "Live" is a claim about the backend, and before the first response lands
   * there is nothing to base it on.
   */
  it("does not call the indexer live before it has answered", () => {
    const html = render();
    expect(html).toContain("connecting…");
    expect(html).not.toContain("indexer live");
  });

  it("names the build in the footer, so a bug report can identify it", () => {
    // Injected by vite.config's `define`; "dev" when there is no git history
    // and no VITE_COMMIT, which is what a bare working tree builds as.
    expect(__COMMIT__).toBeTruthy();
    expect(render()).toContain(__COMMIT__);
  });

  it("links out to the other half of the project and to the source", () => {
    const html = render();
    expect(html).toContain("https://app.lelantos.xyz");
    expect(html).toContain("https://github.com/lelantos-org");
    expect(html).toContain("no cookies");
  });
});
