export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Tooltip, for a label too short to carry its own meaning. */
  title?: string;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
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
  onChange,
}: Props<T>) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg__b ${o.value === value ? "seg__b--on" : ""}`}
          title={o.title}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
