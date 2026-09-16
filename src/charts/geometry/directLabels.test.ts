import { describe, expect, it } from "vitest";
import { labelBaselines } from "./directLabels";

const TOP = 18;
const BOTTOM = 252;

describe("labelBaselines", () => {
  it("leaves two well-separated labels level with their own lines", () => {
    const { a, b } = labelBaselines(60, 200, TOP, BOTTOM);
    expect(a).toBe(64);
    expect(b).toBe(204);
  });

  it("pushes two ends that nearly meet apart, keeping their order", () => {
    const { a, b } = labelBaselines(100, 104, TOP, BOTTOM);
    expect(b - a).toBeGreaterThanOrEqual(13);
    expect(a).toBeLessThan(b);
  });

  it("puts the second series on top when its line ends higher", () => {
    const { a, b } = labelBaselines(104, 100, TOP, BOTTOM);
    expect(b).toBeLessThan(a);
  });

  it("keeps both labels inside the plot", () => {
    const { a, b } = labelBaselines(0, 2, TOP, BOTTOM);
    expect(Math.min(a, b)).toBeGreaterThanOrEqual(TOP + 13);
    expect(Math.max(labelBaselines(300, 310, TOP, BOTTOM).b)).toBeLessThanOrEqual(BOTTOM);
  });
});
