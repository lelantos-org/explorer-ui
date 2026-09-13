import "./Legend.css";
import Swatch from "./Swatch";

export interface LegendItem {
  label: string;
  /** The series colour, as a CSS value — a token, never a literal. */
  color: string;
}

/**
 * The key to a chart or a scale, for a card's header.
 *
 * Always present wherever colour carries a series. Deposit and withdraw separate
 * by only ΔE 7.5 under deuteranopia (design/screens/chart-system), which is
 * legal only with a second channel of encoding — and a word beside each swatch
 * is the one channel that works on every chart.
 *
 * A list, so a screen reader announces how many series there are before it
 * reads them. The swatches are decoration: the words carry the meaning.
 */
export default function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label} className="legend__i">
          <Swatch color={item.color} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
