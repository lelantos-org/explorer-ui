import { assetOptionLabel } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { RANGES, rangeIndexOf } from "../../lib/ranges";
import { encodeScope, type ScopeGroup } from "../../lib/scope";
import Segmented from "../ui/Segmented";

interface Props {
  scope: string;
  rangeIdx: number;
  hasFilter: boolean;
  loading: boolean;
  groups: ScopeGroup[];
  onScopeChange: (v: string) => void;
  onRangeChange: (i: number) => void;
  onClear: () => void;
}

export default function FilterBar({
  scope,
  rangeIdx,
  hasFilter,
  loading,
  groups,
  onScopeChange,
  onRangeChange,
  onClear,
}: Props) {
  return (
    <div className="filters filters--sticky">
      <label className="fld fld--grow">
        <span className="fld__lbl">scope</span>
        {/* Chain and asset are one control: an assetIdU64 is only meaningful
            alongside its chain, so they cannot be selected independently. */}
        <select
          className="fld__inp fld__inp--scope"
          value={scope}
          onChange={(e) => onScopeChange(e.target.value)}
        >
          <option value="">all chains</option>
          {groups.map((g) => {
            const chainId = String(g.chainId);
            const meta = getChainMeta(g.chainId);
            return (
              <optgroup key={g.chainId} label={`${meta.name} · id ${g.chainId}`}>
                <option value={encodeScope({ chainId, assetIdU64: "" })}>all assets</option>
                {g.assets.map((a) => (
                  <option
                    key={a.assetIdU64}
                    value={encodeScope({ chainId, assetIdU64: String(a.assetIdU64) })}
                  >
                    {assetOptionLabel(a)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <div className="fld">
        <span className="fld__lbl">range</span>
        {/* Labels are the range's identity in the URL too (`?range=7d`), so
            `rangeIndexOf` is the one place a label becomes an index. */}
        <Segmented
          options={RANGES.map((r) => ({ value: r.label, label: r.label }))}
          value={RANGES[rangeIdx].label}
          disabled={loading}
          onChange={(label) => onRangeChange(rangeIndexOf(label))}
        />
      </div>

      {hasFilter && (
        <button type="button" className="btn btn--ghost" onClick={onClear}>
          ✕ clear
        </button>
      )}
      {loading && <span className="muted live">querying…</span>}
    </div>
  );
}
