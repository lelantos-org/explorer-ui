import type { AnonymitySet, AssetOut, TxKind, TxOut } from "../../api";
import { type Cohorts, indexCohorts, txPrivacy } from "../../lib/anonymity";
import { assetKey, indexAssets } from "../../lib/assets";
import { getChainMeta, getTxUrl } from "../../lib/chains";
import { fmtAge } from "../../lib/format";
import { shortHex, withHexPrefix } from "../../lib/hex";
import { KIND_TITLE, type KindFilter } from "../../lib/kinds";
import Hex from "../ui/Hex";

interface Props {
  data: TxOut[] | null;
  /** Registry, used to name the asset a row moved: its symbol when the indexer
   *  has one, its address otherwise. */
  assets: AssetOut[] | null;
  /** Cohort sizes per denomination, joined onto the withdrawals to say how much
   *  cover each one got. Null while loading: the column then reports unknown
   *  rather than guessing a k. */
  cohorts: AnonymitySet[] | null;
  loading: boolean;
  /** The kind the feed is pinned to. Named in the empty state so a filter with
   *  no matches never reads as a dead chain. */
  kind: KindFilter;
}

/**
 * What cover a row got. The tone carries the reading; the title carries why.
 *
 * Only withdrawals publish a denomination, so only they have an anonymity set
 * to report. The rest take the same dash the amount column gives a row it has
 * no figure for — the alternative, scoring them on an axis they are not on,
 * reads as a verdict where there is no measurement.
 */
function PrivacyCell({ tx, cohorts }: { tx: TxOut; cohorts: Cohorts }) {
  const privacy = txPrivacy(tx, cohorts);
  if (privacy === null)
    return (
      <span className="muted" title="Only withdrawals publish a denomination.">
        —
      </span>
    );
  return (
    <span className={`priv priv--${privacy.tone}`} title={privacy.title}>
      {privacy.label}
    </span>
  );
}

function KindBadge({ kind }: { kind: TxKind }) {
  return (
    <span className={`kind kind--${kind}`} title={KIND_TITLE[kind]}>
      {kind}
    </span>
  );
}

function AssetCell({ tx, byAsset }: { tx: TxOut; byAsset: Map<string, AssetOut> }) {
  // Transfers move no public value, so they name no asset.
  if (tx.assetIdU64 === null) return <span className="muted">—</span>;
  const asset = byAsset.get(assetKey(tx.chainId, tx.assetIdU64));
  // Registered after this page loaded, or on a chain we have no registry for:
  // nothing to name it by, and the registry id names only the row.
  if (!asset)
    return (
      <span className="muted" title="token not in the loaded registry">
        unknown token
      </span>
    );
  return (
    <span className="asset">
      {/* The symbol leads when the indexer has read one; the address always
          trails as the thing that actually identifies the token. */}
      {asset.symbol && <span className="asset__sym">{asset.symbol}</span>}
      <Hex value={asset.tokenHex} truncate={4} className="asset__tok" />
    </span>
  );
}

export default function LatestTxList({ data, assets, cohorts, loading, kind }: Props) {
  if (loading && !data) return <div className="empty">loading…</div>;
  if (!data || data.length === 0)
    return <div className="empty">no recent {kind && `${kind} `}activity</div>;

  const byAsset = indexAssets(assets);
  const byDenom = indexCohorts(cohorts);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>age</th>
            <th>kind</th>
            <th>chain</th>
            <th>asset</th>
            <th>block</th>
            <th>amount</th>
            <th>privacy</th>
            <th>tx</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const url = getTxUrl(r.chainId, r.txHashHex);
            const full = withHexPrefix(r.txHashHex);
            return (
              <tr key={`${r.chainId}-${r.txHashHex}-${r.kind}`}>
                <td className="muted">{fmtAge(r.blockTs)}</td>
                <td>
                  <KindBadge kind={r.kind} />
                </td>
                <td>{getChainMeta(r.chainId).short}</td>
                <td>
                  <AssetCell tx={r} byAsset={byAsset} />
                </td>
                <td className="mono">{r.blockNumber.toLocaleString()}</td>
                <td className="mono">
                  {/* Transfers move no public value, and an unresolved token
                      shows nothing rather than a wrong number. */}
                  {r.amount === null ? <span className="muted">—</span> : r.amount}
                </td>
                <td>
                  <PrivacyCell tx={r} cohorts={byDenom} />
                </td>
                <td>
                  {url ? (
                    <a
                      className="lnk lnk--inline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={full}
                    >
                      {shortHex(r.txHashHex, 6)}
                    </a>
                  ) : (
                    <span className="hex" title={full}>
                      {shortHex(r.txHashHex, 6)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
