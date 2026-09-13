import Segmented, { type SegmentedOption } from "@/ui/Segmented";
import type { ReferenceTab } from "./referenceTab";
import "./ReferenceTabs.css";

const OPTIONS: SegmentedOption<ReferenceTab>[] = [
  { value: "activity", label: "Activity", title: "the latest transactions, on every chain" },
  {
    value: "assets",
    label: "Assets",
    title: "every asset the pool accepts, and what each leg costs",
  },
  { value: "chains", label: "Chains", title: "what moved on each chain in the last 24h" },
  {
    value: "pool",
    label: "In the pool",
    title: "what the pool holds, and the notes committed to it",
  },
];

interface Props {
  value: ReferenceTab;
  onChange: (tab: ReferenceTab) => void;
}

/**
 * The strip that swaps the reference cards below the findings. Full width and
 * split evenly, so it reads as a divider with a control on it rather than as a
 * control belonging to the card directly beneath.
 *
 * Buttons rather than a `tablist`: `role="tab"` promises arrow-key navigation
 * between the tabs and `aria-controls` on each panel, and `Segmented` implements
 * neither — the same reason it uses `aria-pressed` rather than a radiogroup.
 */
export default function ReferenceTabs({ value, onChange }: Props) {
  return (
    <div className="ref-tabs">
      <span className="lbl">reference</span>
      <Segmented
        label="reference cards"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        stretch
        tone="neutral"
      />
    </div>
  );
}
