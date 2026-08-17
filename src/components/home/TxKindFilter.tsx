import { TX_KINDS, type TxKind } from "../../api";
import { KIND_TITLE } from "../../lib/kinds";

interface Props {
  value: TxKind | "";
  loading: boolean;
  onChange: (kind: TxKind | "") => void;
}

/**
 * Pins the latest-transactions feed to one kind. Exclusive, with "all" as a
 * real option rather than a clear button: the four kinds partition the feed,
 * so "all" is the fifth choice in the same set and not the absence of one.
 *
 * The filter is applied by the backend, not to the rows already fetched, so a
 * pinned kind still fills the table.
 */
export default function TxKindFilter({ value, loading, onChange }: Props) {
  return (
    <div className="seg">
      <button
        type="button"
        className={`seg__b ${value === "" ? "seg__b--on" : ""}`}
        onClick={() => onChange("")}
        disabled={loading}
      >
        all
      </button>
      {TX_KINDS.map((k) => (
        <button
          key={k}
          type="button"
          className={`seg__b ${value === k ? "seg__b--on" : ""}`}
          title={KIND_TITLE[k]}
          onClick={() => onChange(k)}
          disabled={loading}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
