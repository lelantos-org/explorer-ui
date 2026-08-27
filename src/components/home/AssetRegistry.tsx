import type { AssetOut } from "../../api";
import { assetLabel } from "../../lib/assets";
import { getChainMeta, getTokenUrl } from "../../lib/chains";
import { feeDisplay } from "../../lib/fees";
import { fmtUsd } from "../../lib/format";
import { withHexPrefix } from "../../lib/hex";
import type { ScopeGroup } from "../../lib/scope";

interface Props {
  groups: ScopeGroup[];
  loading: boolean;
  /** Chain currently pinned by the filter bar, or null for all of them. */
  selected: number | null;
  onSelect?: (chainId: number | null) => void;
}

/**
 * A rate, as a pill. Its tone is the state `feeDisplay` already decided, so
 * the three cases are classified in one place rather than again here.
 */
function Fee({ bps }: { bps: number | null }) {
  const { state, text, title } = feeDisplay(bps);
  return (
    <span className={`fee fee--${state}`} title={title}>
      {text}
    </span>
  );
}

/** Spot price, or a marked gap. Absence is the provider's, not the pool's. */
function Price({ usd }: { usd: number | null }) {
  if (usd === null) {
    return (
      <span className="muted" title="no price from the provider">
        —
      </span>
    );
  }
  return <>{fmtUsd(usd)}</>;
}

/**
 * The asset's name, linking out to its page on the chain's explorer.
 *
 * The address is the link rather than a column of its own: it identifies the
 * token but nobody reads a truncated hex, and every reason to want it — check
 * the contract, see holders — is a click away on the explorer.
 *
 * `assetLabel` supplies the text, so an asset whose `symbol()` never resolved
 * is named by its short address here exactly as it is everywhere else.
 */
function AssetName({ asset }: { asset: AssetOut }) {
  const label = assetLabel(asset);
  const full = withHexPrefix(asset.tokenHex);
  const url = getTokenUrl(asset.chainId, asset.tokenHex);

  // Local dev chains have no explorer, so the name stays plain text rather
  // than becoming a link into nowhere. The address is still in the tooltip.
  if (!url) {
    return (
      <span className="asset__sym" title={full}>
        {label}
      </span>
    );
  }

  return (
    <a
      className="asset__sym lnk lnk--inline"
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`${full} — open on the explorer`}
    >
      {label}
    </a>
  );
}

interface ChainProps {
  group: ScopeGroup;
  /** Whether this chain is the one the filter bar has pinned. */
  pinned: boolean;
  onToggle?: () => void;
}

function ChainAssets({ group, pinned, onToggle }: ChainProps) {
  const meta = getChainMeta(group.chainId);
  const count = group.assets.length;

  return (
    <div className={`registry__chain ${pinned ? "registry__chain--on" : ""}`}>
      <button
        type="button"
        className="registry__hdr"
        onClick={onToggle}
        title={pinned ? "clear the chain filter" : `filter the page to ${meta.name}`}
      >
        <span className="registry__short">{meta.short}</span>
        <span className="registry__name">{meta.name}</span>
        <span className="muted registry__count">
          {count} {count === 1 ? "asset" : "assets"}
        </span>
        {/* The affordance is worth spelling out: the page is already filtered,
            so nothing about the row itself says it is the thing to click to
            get back. */}
        <span className="registry__hint muted">{pinned ? "clear ×" : "filter"}</span>
      </button>

      {count === 0 ? (
        // A chain can report activity while owning no registered assets, so
        // this is a real state rather than a loading one.
        <div className="empty">no assets registered</div>
      ) : (
        <div className="tbl-wrap registry__tbl">
          <table className="tbl">
            <thead>
              <tr>
                <th>asset</th>
                <th className="tbl__num">price</th>
                {/* Named by direction rather than by leg: "shield" and
                    "unshield" are the pool's words, "in"/"out" is what a
                    reader is actually deciding between. */}
                <th className="tbl__num" title="charged on top of the amount you shield">
                  fee in
                </th>
                <th className="tbl__num" title="skimmed from the amount you unshield">
                  fee out
                </th>
              </tr>
            </thead>
            <tbody>
              {group.assets.map((a) => (
                <tr key={a.assetIdU64}>
                  <td>
                    <AssetName asset={a} />
                  </td>
                  <td className="mono tbl__num">
                    <Price usd={a.priceUsd} />
                  </td>
                  <td className="tbl__num">
                    <Fee bps={a.depositBps} />
                  </td>
                  <td className="tbl__num">
                    <Fee bps={a.withdrawBps} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Every asset the pool accepts, grouped under the chain that owns it.
 *
 * Reference material rather than a metric: what a wallet needs before it can
 * shield anything — which tokens are accepted, what each leg costs, and which
 * fields the indexer has not resolved yet.
 *
 * Fees are per asset and per leg, so they only exist as a table like this;
 * there is no single number a header could carry.
 */
export default function AssetRegistry({ groups, loading, selected, onSelect }: Props) {
  if (loading && groups.length === 0) return <div className="empty">loading…</div>;
  if (groups.length === 0) return <div className="empty">no assets registered yet</div>;

  return (
    <div className="registry">
      {groups.map((group) => (
        <ChainAssets
          key={group.chainId}
          group={group}
          pinned={selected === group.chainId}
          onToggle={() => onSelect?.(selected === group.chainId ? null : group.chainId)}
        />
      ))}
    </div>
  );
}
