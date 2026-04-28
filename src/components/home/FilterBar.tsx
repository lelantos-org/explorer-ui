import type { AssetOut } from "../../types";
import { RANGES } from "../../lib/ranges";

interface Props {
  chainId: string;
  assetIdU64: string;
  rangeIdx: number;
  hasFilter: boolean;
  loading: boolean;
  chains: number[];
  assetOptions: AssetOut[];
  onChainChange: (v: string) => void;
  onAssetChange: (v: string) => void;
  onRangeChange: (i: number) => void;
  onClear: () => void;
}

export default function FilterBar({
  chainId,
  assetIdU64,
  rangeIdx,
  hasFilter,
  loading,
  chains,
  assetOptions,
  onChainChange,
  onAssetChange,
  onRangeChange,
  onClear,
}: Props) {
  return (
    <div className="filters filters--sticky">
      <label className="fld">
        <span className="fld__lbl">chain</span>
        <select
          className="fld__inp"
          value={chainId}
          onChange={(e) => onChainChange(e.target.value)}
        >
          <option value="">all</option>
          {chains.map((c) => (
            <option key={c} value={c}>chain {c}</option>
          ))}
        </select>
      </label>

      <label className="fld">
        <span className="fld__lbl">asset</span>
        <select
          className="fld__inp"
          value={assetIdU64}
          onChange={(e) => onAssetChange(e.target.value)}
        >
          <option value="">all</option>
          {assetOptions.map((a) => (
            <option key={`${a.chain_id}-${a.asset_id_u64}`} value={a.asset_id_u64}>
              #{a.asset_id_u64} · chain {a.chain_id}
            </option>
          ))}
        </select>
      </label>

      <div className="fld">
        <span className="fld__lbl">range</span>
        <div className="seg">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              className={`seg__b ${i === rangeIdx ? "seg__b--on" : ""}`}
              onClick={() => onRangeChange(i)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {hasFilter && (
        <button className="btn btn--ghost" onClick={onClear}>
          ✕ clear
        </button>
      )}
      {loading && <span className="muted live">querying…</span>}
    </div>
  );
}
