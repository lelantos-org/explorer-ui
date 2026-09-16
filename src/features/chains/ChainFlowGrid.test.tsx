import { describe, expect, it } from "vitest";
import type { ChainFlow } from "@/api";
import { chainFlowRow } from "@/test/fixtures";
import { renderHtml } from "@/test/render";
import ChainFlowGrid from "./ChainFlowGrid";

/** A chain with traffic but no per-asset value, which is what the backend
 *  reports today: `inflow`/`outflow` are reserved and still zero. */
const flow = (over: Partial<ChainFlow> = {}) =>
  chainFlowRow({ hourlyIn: [1, 2, 3], txCount: 100, ...over });

const render = (data: ChainFlow[] | null, selected: number | null = null) =>
  renderHtml(<ChainFlowGrid data={data} selected={selected} />);

describe("ChainFlowGrid", () => {
  it("lists one card per indexed chain", () => {
    const html = render([flow({ chainId: 1 }), flow({ chainId: 10 })]);
    expect(html).toContain("ETH");
    expect(html).toContain("OP");
  });

  /**
   * The backend lists every chain it indexes, so `txCount: 0` is a measurement —
   * scanned, and nothing happened. Dropping the card would read as a chain
   * nobody watches, which is a different claim.
   */
  it("keeps a quiet chain in the grid rather than dropping it", () => {
    const html = render([flow({ chainId: 1, txCount: 0 }), flow({ chainId: 10 })]);
    expect(html).toContain("chain-card--idle");
    expect(html).toContain("idle · 24h");
    expect(html).toContain("ETH");
  });

  /**
   * An empty response is not a quiet day. Every indexed chain would be present
   * with zeroes, so nothing at all means nothing is being indexed.
   */
  it("separates loading from nothing being indexed", () => {
    expect(render(null)).toContain('aria-label="loading"');
    expect(render([])).toContain("no chains indexed");
    expect(render([])).not.toContain('aria-label="loading"');
  });

  /**
   * The placeholders are card-shaped to hold the grid's height, but they are one
   * loading region — a screen reader should not walk three decorative divs.
   */
  it("announces the placeholder grid once and hides the cards from it", () => {
    const html = render(null);
    expect(html).toContain('role="status"');
    // The grid class survives, so the placeholder occupies the real layout.
    expect(html).toContain("chain-grid");
    expect(html.match(/aria-label="loading"/g)).toHaveLength(1);
    expect(html.match(/chain-card--ghost/g)).toHaveLength(3);
    expect(html).toContain('aria-hidden="true"');
  });

  it("marks the pinned chain", () => {
    expect(render([flow({ chainId: 1 })], 1)).toContain("chain-card--on");
    expect(render([flow({ chainId: 1 })], null)).not.toContain("chain-card--on");
  });

  /**
   * `inflow`/`outflow` are reserved and still zero, so the card reports tx count
   * alone rather than rendering 0 in/out/net as if they were measurements.
   */
  it("reports tx count alone while the value fields are still reserved", () => {
    const html = render([flow({ txCount: 100 })]);
    expect(html).toContain("tx · 24h");
    expect(html).not.toContain("▲ in");
  });

  it("shows the value breakdown once the backend reports any", () => {
    const html = render([flow({ inflow: 500, outflow: 200 })]);
    expect(html).toContain("▲ in");
    expect(html).toContain("▼ out");
    expect(html).toContain("net");
  });
});
