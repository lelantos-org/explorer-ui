import { cx } from "@/lib/cx";
import "./Segmented.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Tooltip, for a label too short to carry its own meaning. */
  title?: string;
}

interface Props<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  disabled?: boolean;
  /** Names the group for assistive tech. The visible caption beside it is a
   *  plain span, so without this the row of buttons has no collective name. */
  label: string;
  onChange: (value: T) => void;
  /** `sm` for a control that scopes one card rather than the page, so it does
   *  not read as one of the page's own controls. */
  size?: "md" | "sm";
  /** Split the row evenly across the full width. */
  stretch?: boolean;
  /**
   * How the chosen segment is filled. `accent` for a filter that changes what
   * the figures mean; `neutral` for a switch that only changes which cards are
   * on show — two accent segments on one screen read as two versions of the
   * same filter.
   */
  tone?: "accent" | "neutral";
}

/**
 * Exclusive choice in a row of joined buttons.
 *
 * Keyed by value rather than by index: a caller reading `value === "withdraw"`
 * can be checked against the option list, where `value === 3` can only be
 * checked against the order the array happened to be in.
 */
export default function Segmented<T extends string>({
  options,
  value,
  disabled = false,
  label,
  onChange,
  size = "md",
  stretch = false,
  tone = "accent",
}: Props<T>) {
  return (
    // `aria-pressed` rather than a radiogroup: these are buttons that act on
    // click, not inputs that hold a value until a form is submitted, and
    // `radiogroup` would promise arrow-key navigation this does not implement.
    // Without it the selected segment was distinguished by colour alone.
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> is for grouping form controls; these are buttons that act on click, not inputs inside a form
    <div
      className={cx("seg", `seg--${size}`, `seg--${tone}`, stretch && "seg--stretch")}
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx("seg__b", o.value === value && "seg__b--on")}
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
