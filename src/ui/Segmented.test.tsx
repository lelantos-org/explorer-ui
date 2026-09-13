import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Segmented from "./Segmented";

const OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

const render = (value: string) =>
  renderToString(<Segmented label="range" options={OPTIONS} value={value} onChange={() => {}} />);

describe("Segmented", () => {
  /// Which segment is chosen used to be carried by a class and its colour and
  /// nothing else, so the state was unavailable to anyone not looking at it.
  it("marks the chosen segment as pressed and the others as not", () => {
    const html = render("7d");

    expect(html).toMatch(/aria-pressed="true"[^>]*>7d</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>24h</);
  });

  it("names the group, since its visible caption is a plain span", () => {
    expect(render("24h")).toContain('aria-label="range"');
  });

  it("moves the pressed state with the value", () => {
    expect(render("24h")).toMatch(/aria-pressed="true"[^>]*>24h</);
  });
});
