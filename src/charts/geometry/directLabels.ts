/** Gap between a line's last point and its label, in pixels. */
export const LABEL_DX = 6;
/** Closest two label baselines may sit before they are pushed apart. */
const LABEL_MIN_DY = 13;
/** Half the label's cap height, to centre it on the line rather than sit on it. */
const LABEL_NUDGE = 4;

/**
 * Baselines for the labels at the end of two lines.
 *
 * Each sits level with its own line, unless that would overlap the other — then
 * both move apart from their midpoint, keeping their order. Clamped inside the
 * plot so neither is clipped at the top or run into the axis.
 *
 * Why the labels exist at all: the flow pair is only 7.5 ΔE apart for a
 * deuteranope (design/screens/chart-system), so each series is named where it
 * ends as well as in the legend.
 */
export function labelBaselines(
  yA: number,
  yB: number,
  top: number,
  bottom: number,
): { a: number; b: number } {
  let a = yA + LABEL_NUDGE;
  let b = yB + LABEL_NUDGE;
  if (Math.abs(a - b) < LABEL_MIN_DY) {
    const mid = (a + b) / 2;
    // Equal ends put the first series on top.
    const aAbove = yA <= yB;
    a = mid + (aAbove ? -LABEL_MIN_DY : LABEL_MIN_DY) / 2;
    b = mid + (aAbove ? LABEL_MIN_DY : -LABEL_MIN_DY) / 2;
  }
  const clamp = (y: number) => Math.min(Math.max(y, top + LABEL_MIN_DY), bottom);
  return { a: clamp(a), b: clamp(b) };
}
