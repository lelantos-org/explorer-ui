import { memo } from "react";
import type { AssetOut, TxOut } from "@/api";
import { assetKey, assetLabel } from "@/lib/assets";
import { getChainMeta, getTxUrl } from "@/lib/chains";
import { fmtAge } from "@/lib/format";
import { shortHex, withHexPrefix } from "@/lib/hex";
import type { Cohorts } from "@/lib/txPrivacy";
import AssetIdTag from "@/ui/AssetIdTag";
import ExternalLink from "@/ui/ExternalLink";
import KindBadge from "./KindBadge";
import PrivacyCell from "./PrivacyCell";

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
      {/* The symbol when the indexer has read one, the short address when it
          has not — `assetLabel` decides, as it does everywhere an asset is
          named. The full address is in the title rather than a column: it
          identifies the token, but nobody reads a truncated hex in a feed. */}
      <span className="asset__sym" title={withHexPrefix(asset.tokenHex)}>
        {assetLabel(asset)}
      </span>
      {/* The circuit id follows because the privacy column is computed per id:
          two withdrawals of one token at one denomination can carry different
          k's, and without the id the feed shows the difference while hiding
          its cause. */}
      <AssetIdTag assetIdU64={tx.assetIdU64} />
    </span>
  );
}

/** The transaction hash, linking out when the chain has an explorer. */
function TxHash({ tx }: { tx: TxOut }) {
  const url = getTxUrl(tx.chainId, tx.txHashHex);
  const full = withHexPrefix(tx.txHashHex);
  const short = shortHex(tx.txHashHex, 6);
  // Local dev chains have no explorer: the hash stays selectable in one gesture
  // rather than wearing a link's affordance with nowhere to go.
  if (!url)
    return (
      <span className="tx-hash" title={full}>
        {short}
      </span>
    );
  return (
    <ExternalLink className="tx-hash tx-hash--link" href={url} title={full}>
      {short}
    </ExternalLink>
  );
}

interface Props {
  tx: TxOut;
  byAsset: Map<string, AssetOut>;
  cohorts: Cohorts;
  /** The clock the age is measured against, in epoch ms. Passed in rather than
   *  read here, so a memoised row still ages when the feed itself has not
   *  changed. */
  now: number;
}

/** One transaction in the feed. */
function TxRow({ tx, byAsset, cohorts, now }: Props) {
  return (
    <tr>
      <td className="num muted">{fmtAge(tx.blockTs, Math.floor(now / 1000))}</td>
      <td>
        <KindBadge kind={tx.kind} />
      </td>
      <td className="num">{getChainMeta(tx.chainId).short}</td>
      <td className="num">
        <AssetCell tx={tx} byAsset={byAsset} />
      </td>
      <td className="num muted">{tx.blockNumber.toLocaleString()}</td>
      <td className="num tbl__num feed__amount">
        {/* Transfers move no public value, and an unresolved token
            shows nothing rather than a wrong number. */}
        {tx.amount === null ? <span className="muted">—</span> : tx.amount}
      </td>
      <td className="tbl__num">
        <PrivacyCell tx={tx} cohorts={cohorts} />
      </td>
      <td className="num tbl__num">
        <TxHash tx={tx} />
      </td>
    </tr>
  );
}

export default memo(TxRow);
