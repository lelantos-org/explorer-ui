import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ApiProvider, createMockApi } from "./api";

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

  it("renders every card", () => {
    const html = render();
    for (const title of [
      "chain flows · last 24h",
      "inflow / outflow",
      "transactions over time",
      "transactions by kind",
      "latest transactions",
    ]) {
      expect(html).toContain(title);
    }
  });

  it("shows unknown rather than zero before anything has resolved", () => {
    const html = render();
    // The placeholder for a figure that is not in yet. A 0 here would be a
    // measurement the backend never made.
    expect(html).toContain("···");
    expect(html).toContain("loading…");
  });

  it("defaults to the 30d range with no query string", () => {
    expect(render()).toContain("30d window");
  });
});
