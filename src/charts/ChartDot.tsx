/** Radius of a plotted point, whether it marks a hover or a lone bucket. */
const DOT_R = 4;

interface Props {
  x: number;
  y: number;
  /** Which series the point belongs to; picks its colour. */
  series: "in" | "out";
}

/** A marker on a series: the point under the cursor, or the single bucket of a
 *  range too short to draw a line through. */
export default function ChartDot({ x, y, series }: Props) {
  return <circle cx={x} cy={y} r={DOT_R} className={`chart__pt--${series}`} />;
}
