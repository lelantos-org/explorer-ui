import type { ChainLocked, LockedAsset } from "../../api";
import { assetIdTag, assetLabel } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { fmtTokens, fmtUsd, joinMeta } from "../../lib/format";
import Skeleton, { BarRows } from "../ui/Skeleton";

interface Props {
  data: ChainLocked[] | null;
  loading: boolean;
  selected: number | null;
  onSelect?: (chainId: number | null) => void;
}

/**
 * What each chain's escrow holds.
 *
 * Dollars are the only figure that adds up across a chain's assets, so they are
 * the headline; the per-asset amounts beside them are the exact quantities, and
 * the only honest thing to show for an asset with no price.
 *
 * Two definitions produce those quantities and the chips say which. Most assets
 * are all-time deposits minus withdrawals; a yield asset's balance is read from
 * its venue instead, because growth fires no event and the flow difference
 * misses everything it has earned. Rendering both under one label would present
 * a measured holding and a computed difference as the same kind of number.
 */
export default function LockedByChain({ data, loading, selected, onSelect }: Props) {
  if (loading && !data) {
    return (
      <Skeleton>
        {/* Chain, dollar total, then the chip run that fills the rest. */}
        <BarRows count={3} widths={["72px", "88px", "100%"]} height={18} />
      </Skeleton>
    );
  }
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
            aria-pressed={isOn}
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
  const earning = asset.basis === "venueHoldings";
  const title = joinMeta([
    joinMeta([asset.symbol, `publicAssetId ${asset.assetIdU64}`]),
    asset.lockedUsd === null ? "no price" : fmtUsd(asset.lockedUsd),
    earning
      ? "held by the venue — this asset earns, so its balance is read from chain rather than netted from flows"
      : "deposits − withdrawals",
    owed && "negative balance — deposits missing from the index",
  ]);
  return (
    <span
      className={`locked__chip ${owed ? "locked__chip--owed" : ""} ${
        earning ? "locked__chip--earning" : ""
      }`}
      title={title}
    >
      <span className="locked__chip__sym">
        {assetLabel(asset)}
        {/* Two escrow balances of one token are two registrations of it, not a
            rendering fault. "earns" below happens to separate them on this
            deploy, but that is a property of which id got a venue rather than a
            rule, so the id is what actually names the chip. */}
        <span className="locked__chip__id">{assetIdTag(asset.assetIdU64)}</span>
        {/* Spelled out rather than marked with a glyph. The distinction changes
            what the number beside it means, and a bare "~" carries that only to
            a reader who thinks to hover it. */}
        {earning && <span className="locked__chip__basis">earns</span>}
      </span>
      <span className="mono locked__chip__amt">
        {/* Unresolved decimals mean the quantity is unknown; a raw base-unit
            figure would be wrong by orders of magnitude. */}
        {asset.amount === null ? <span className="muted">—</span> : fmtTokens(asset.amount)}
      </span>
    </span>
  );
}
