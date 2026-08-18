import { assetOptionLabel } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { RANGES, type RangeLabel } from "../../lib/ranges";
import { decodeScope, encodeScope, type Scope, type ScopeGroup } from "../../lib/scope";
import Segmented from "../ui/Segmented";

interface Props {
  scope: Scope;
  range: RangeLabel;
  hasFilter: boolean;
  loading: boolean;
  groups: ScopeGroup[];
  onScopeChange: (scope: Scope) => void;
  onRangeChange: (label: RangeLabel) => void;
  onClear: () => void;
}

/**
 * The page's scope and range controls.
 *
 * The `<select>` is the one place a scope has to be a string, so this component
 * owns both crossings — callers hand it a `Scope` and get a `Scope` back.
 */
export default function FilterBar({
  scope,
  range,
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
          value={encodeScope(scope)}
          onChange={(e) => onScopeChange(decodeScope(e.target.value))}
        >
          <option value="">all chains</option>
          {groups.map((g) => (
            <optgroup key={g.chainId} label={`${getChainMeta(g.chainId).name} · id ${g.chainId}`}>
              <option value={encodeScope({ chainId: g.chainId, assetIdU64: null })}>
                all assets
              </option>
              {g.assets.map((a) => (
                <option
                  key={a.assetIdU64}
                  value={encodeScope({ chainId: g.chainId, assetIdU64: a.assetIdU64 })}
                >
                  {assetOptionLabel(a)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="fld">
        <span className="fld__lbl">range</span>
        {/* Labels are the range's identity in the URL too (`?range=7d`), so the
            picker's value is the same string that is stored and shared. */}
        <Segmented
          options={RANGES.map((r) => ({ value: r.label, label: r.label }))}
          value={range}
          disabled={loading}
          onChange={onRangeChange}
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
