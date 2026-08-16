import type { AssetOut, TxKind, TxOut } from "../../api";
import { getChainMeta, getTxUrl } from "../../lib/chains";
import { fmtAge } from "../../lib/format";
import { shortHex, withHexPrefix } from "../../lib/hex";
import Hex from "../ui/Hex";

interface Props {
  data: TxOut[] | null;
  /** Registry, used to name the asset a row moved. The explorer stores no
   *  token symbols, so the address is the only identifier available. */
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

const assetKey = (chainId: number, assetIdU64: number) => `${chainId}:${assetIdU64}`;

function AssetCell({ assetIdU64, asset }: { assetIdU64: number | null; asset?: AssetOut }) {
  // Transfers move no public value, so they name no asset.
  if (assetIdU64 === null) return <span className="muted">—</span>;
  return (
    <span className="asset">
      <span className="asset__id mono">#{assetIdU64}</span>
      {asset ? (
        <Hex value={asset.tokenHex} truncate={4} className="asset__tok" />
      ) : (
        // Registered after this page loaded, or on a chain we have no
        // registry for: the id is still meaningful on its own.
        <span className="muted asset__tok" title="token address not in the loaded registry">
          unknown token
        </span>
      )}
    </span>
  );
}

export default function LatestTxList({ data, assets, loading }: Props) {
  if (loading && !data) return <div className="empty">loading…</div>;
  if (!data || data.length === 0) return <div className="empty">no recent activity</div>;

  const byAsset = new Map((assets ?? []).map((a) => [assetKey(a.chainId, a.assetIdU64), a]));

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
            const asset =
              r.assetIdU64 === null ? undefined : byAsset.get(assetKey(r.chainId, r.assetIdU64));
            return (
              <tr key={`${r.chainId}-${r.txHashHex}-${r.kind}`}>
                <td className="muted">{fmtAge(r.blockTs)}</td>
                <td>
                  <KindBadge kind={r.kind} />
                </td>
                <td>{getChainMeta(r.chainId).short}</td>
                <td>
                  <AssetCell assetIdU64={r.assetIdU64} asset={asset} />
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
