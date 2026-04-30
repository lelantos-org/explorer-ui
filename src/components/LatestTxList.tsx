import type { TreeAdvanceOut } from "../types";
import { fmtAge } from "../lib/format";
import { getChainMeta, getTxUrl } from "../lib/chains";

interface Props {
  data: TreeAdvanceOut[] | null;
  loading: boolean;
}

function shortHex(value: string, truncate = 6): string {
  const v = value.startsWith("0x") ? value : `0x${value}`;
  return v.length > truncate * 2 + 2 ? `${v.slice(0, truncate + 2)}…${v.slice(-truncate)}` : v;
}

export default function LatestTxList({ data, loading }: Props) {
  if (loading && !data) return <div className="empty">loading…</div>;
  if (!data || data.length === 0) return <div className="empty">no recent activity</div>;

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>age</th>
            <th>chain</th>
            <th>block</th>
            <th>tx</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const meta = getChainMeta(r.chain_id);
            const url = getTxUrl(r.chain_id, r.tx_hash_hex);
            const label = shortHex(r.tx_hash_hex);
            const full = r.tx_hash_hex.startsWith("0x") ? r.tx_hash_hex : `0x${r.tx_hash_hex}`;
            return (
              <tr key={`${r.chain_id}-${r.block_number}-${r.log_index}`}>
                <td className="muted">{fmtAge(r.block_ts)}</td>
                <td>{meta.short}</td>
                <td className="mono">{r.block_number.toLocaleString()}</td>
                <td>
                  {url ? (
                    <a
                      className="lnk lnk--inline"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={full}
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="hex" title={full}>{label}</span>
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
