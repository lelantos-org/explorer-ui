import type { ChainLocked, LockedAsset } from "../../api";
import { assetLabel } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { fmtTokens, fmtUsd, joinMeta } from "../../lib/format";

interface Props {
  data: ChainLocked[] | null;
  loading: boolean;
  selected: number | null;
  onSelect?: (chainId: number | null) => void;
}

/**
 * What each chain's escrow holds: all-time deposits minus withdrawals.
 *
 * Dollars are the only figure that adds up across a chain's assets, so they are
 * the headline; the per-asset amounts beside them are the exact quantities, and
 * the only honest thing to show for an asset with no price.
 */
export default function LockedByChain({ data, loading, selected, onSelect }: Props) {
  if (loading && !data) return <div className="empty">loading…</div>;
  if (!data || data.length === 0) return <div className="empty">nothing escrowed yet</div>;

  return (
    <div className="locked">
      {data.map((chain) => {
        const isOn = selected === chain.chainId;
        return (
          <button
            type="button"
            key={chain.chainId}
            className={`locked__row ${isOn ? "locked__row--on" : ""}`}
            onClick={() => onSelect?.(isOn ? null : chain.chainId)}
          >
            <ChainName chainId={chain.chainId} />
            <ChainTotal chain={chain} />
            <div className="locked__assets">
              {chain.assets.map((asset) => (
                <AssetChip key={`${chain.chainId}-${asset.assetIdU64}`} asset={asset} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ChainName({ chainId }: { chainId: number }) {
  const meta = getChainMeta(chainId);
  return (
    <div className="locked__chain">
      <span className="locked__short">{meta.short}</span>
      <span className="muted locked__name">{meta.name}</span>
    </div>
  );
}

function ChainTotal({ chain }: { chain: ChainLocked }) {
  // Nothing on the chain could be priced. The per-asset amounts are still
  // exact, so the row still says something — the total does not.
  if (chain.lockedUsd === null) {
    return (
      <div className="locked__total muted" title="no usable price for any asset on this chain">
        unpriced
      </div>
    );
  }
  return (
    <div className="locked__total mono">
      {fmtUsd(chain.lockedUsd)}
      {chain.unpricedAssets > 0 && (
        <span className="warn locked__partial" title="excluded from the dollar total">
          {` · ${chain.unpricedAssets} unpriced`}
        </span>
      )}
    </div>
  );
}

function AssetChip({ asset }: { asset: LockedAsset }) {
  // Negative is not a rendering bug: escrow cannot owe money, so it means the
  // indexer missed deposits. Marked, not hidden.
  const owed = asset.amount !== null && asset.amount < 0;
  const title = joinMeta([
    asset.symbol,
    asset.lockedUsd === null ? "no price" : fmtUsd(asset.lockedUsd),
    owed && "negative balance — deposits missing from the index",
  ]);
  return (
    <span className={`locked__chip ${owed ? "locked__chip--owed" : ""}`} title={title}>
      <span className="locked__chip__sym">{assetLabel(asset)}</span>
      <span className="mono locked__chip__amt">
        {/* Unresolved decimals mean the quantity is unknown; a raw base-unit
            figure would be wrong by orders of magnitude. */}
        {asset.amount === null ? <span className="muted">—</span> : fmtTokens(asset.amount)}
      </span>
    </span>
  );
}
