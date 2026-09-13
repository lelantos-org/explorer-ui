import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PoolNotes as PoolNotesRow } from "@/api";
import PoolNotes from "./PoolNotes";

const row = (over: Partial<PoolNotesRow> = {}): PoolNotesRow => ({
  chainId: 1,
  leaves: 1_000,
  feeNotes: 200,
  lastTs: 1_700_000_000,
  ...over,
});

const render = (data: PoolNotesRow[] | null, loading = false, selected: number | null = null) =>
  renderToString(<PoolNotes data={data} loading={loading} selected={selected} />).replaceAll(
    "<!-- -->",
    "",
  );

describe("PoolNotes", () => {
  /**
   * Every deposit occupies two leaves, the second paying whoever flushed it.
   * A relayer's fee note is nobody's cover, so the headline figure has to be
   * net of them — reporting 1,000 where 800 belong to users overstates the pool.
   */
  it("leads with the user notes rather than the raw leaf count", () => {
    const html = render([row({ leaves: 1_000, feeNotes: 200 })]);
    expect(html).toContain("800");
    // Both inputs stay visible so the subtraction can be checked.
    expect(html).toContain("1,000 leaves");
    expect(html).toContain("200 relayer");
  });

  it("keeps each chain on its own row", () => {
    // The trees are separate, so the counts do not add: no total is rendered.
    const html = render([row({ chainId: 1, leaves: 10, feeNotes: 0 }), row({ chainId: 10 })]);
    expect(html).toContain("ETH");
    expect(html).toContain("OP");
  });

  it("marks the pinned chain", () => {
    expect(render([row()], false, 1)).toContain("notes__row--on");
    expect(render([row()], false, null)).not.toContain("notes__row--on");
  });

  it("separates loading from an empty tree", () => {
    // The skeleton is announced as a loading region; asserting the accessible
    // name rather than a class keeps this from breaking on a restyle.
    expect(render(null, true)).toContain('aria-label="loading"');
  });

  /**
   * The page re-reads the backend every 30s, so `loading` goes true again with
   * rows already on screen. Showing the skeleton then would strobe the card
   * twice a minute and throw away data that is still perfectly good.
   */
  it("keeps the rows on screen while a refetch is in flight", () => {
    const html = render([row()], true);
    expect(html).not.toContain('aria-label="loading"');
    expect(html).toContain("800");
    expect(render([])).toContain("no notes committed yet");
  });
});
