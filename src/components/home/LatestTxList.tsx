import type { AssetOut, TxKind, TxOut } from "../../api";
import { assetKey, indexAssets } from "../../lib/assets";
import { getChainMeta, getTxUrl } from "../../lib/chains";
import { fmtAge } from "../../lib/format";
import { shortHex, withHexPrefix } from "../../lib/hex";
import Hex from "../ui/Hex";

interface Props {
  data: TxOut[] | null;
  /** Registry, used to name the asset a row moved: its symbol when the indexer
   *  has one, its address otherwise. */
  assets: AssetOut[] | null;
  loading: boolean;
}

// `pending` is the only kind that can still change: it becomes `deposit` once
// the relayer flushes it into the tree.
const KIND_TITLE: Record<TxKind, string> = {
  deposit: "escrowed deposit, flushed into the tree",
  pending: "escrowed deposit, awaiting a flush",
  transfer: "internal transfer between shielded notes — no public value moved",
  withdraw: "unshield to a public recipient",
};

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

export default function LatestTxList({ data, assets, loading }: Props) {
  if (loading && !data) return <div className="empty">loading…</div>;
  if (!data || data.length === 0) return <div className="empty">no recent activity</div>;

  const byAsset = indexAssets(assets);

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
