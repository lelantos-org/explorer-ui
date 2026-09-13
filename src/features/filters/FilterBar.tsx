import { REFRESH_MS } from "@/config";
import { assetOptionLabel } from "@/lib/assets";
import { getChainMeta } from "@/lib/chains";
import { RANGES, type RangeLabel } from "@/lib/ranges";
import { decodeScope, encodeScope, type Scope, type ScopeGroup } from "@/lib/scope";
import Button from "@/ui/Button";
import Segmented from "@/ui/Segmented";
import RefreshStamp from "./RefreshStamp";
import "./FilterBar.css";

interface Props {
  scope: Scope;
  range: RangeLabel;
  hasFilter: boolean;
  loading: boolean;
  /** When the scoped series last arrived; see `Async.updatedAt`. */
  updatedAt: number | null;
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
  updatedAt,
  groups,
  onScopeChange,
  onRangeChange,
  onClear,
}: Props) {
  return (
    <div className="filters filters--sticky">
      <label className="fld fld--grow">
        <span className="lbl">scope</span>
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
        {/* A plain span, not a <label>: it names a group of buttons rather than
            one form control, so it is wired through the group's aria-label
            instead of `htmlFor`. */}
        <span className="lbl">range</span>
        {/* Labels are the range's identity in the URL too (`?range=7d`), so the
            picker's value is the same string that is stored and shared. */}
        {/* Not disabled while a range loads: a response for a superseded range
            is dropped, so switching again mid-request is safe — and a control
            that locks for a round trip reads as broken. */}
        <Segmented
          label="range"
          options={RANGES.map((r) => ({ value: r.label, label: r.label }))}
          value={range}
          onChange={onRangeChange}
        />
      </div>

      {hasFilter && (
        <Button variant="ghost" className="filters__clear" onClick={onClear}>
          <span aria-hidden="true">✕</span> clear
        </Button>
      )}

      <div className="filters__end">
        {/* `.live` is named for a live region and was not one: the status was
            announced to nobody. Always mounted so the region exists before it
            has anything to say — a live region added at the same moment as its
            text is not reliably announced. */}
        <span className="muted live" role="status" aria-live="polite">
          {loading ? "querying…" : ""}
        </span>
        <RefreshStamp updatedAt={updatedAt} pollMs={REFRESH_MS} />
      </div>
    </div>
  );
}
