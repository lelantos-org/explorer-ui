import { memo } from "react";
import type { AnonymitySet, AssetOut } from "@/api";
import { assetKey, assetLabel } from "@/lib/assets";
import { getChainMeta } from "@/lib/chains";
import { coverTone, isDormant, kLabel, RECENT_WINDOW_SEC } from "@/lib/cover";
import { fmtBucket, fmtDigits, plural } from "@/lib/format";
import AssetIdTag from "@/ui/AssetIdTag";
import CoverGlyph from "./CoverGlyph";
import { fill } from "./visibleCohorts";

/** Derived from the window itself, so the two cannot disagree. */
const recentLabel = fmtBucket(RECENT_WINDOW_SEC);

/**
 * Which asset a cohort belongs to, named by its circuit id as well as its
 * symbol.
 *
 * The id is not decoration. `publicAssetId` is what the circuit binds and what
 * a withdrawal publishes, and the registry rejects a duplicate id but not a
 * duplicate token — so one ERC-20 is routinely registered several times, a
 * plain entry and a yield-bearing one being the ordinary case. Those are
 * separate anonymity sets: a withdrawal under one id gives no cover to a
 * withdrawal under another, even at the same denomination of the same token.
 *
 * Naming a cohort by symbol alone would print two of them identically, and two
 * rows reading "WETH · 100,000,000" invite exactly the wrong sum — that a k of
 * 1 and a k of 3 are really a k of 4. Shown on every row rather than only where
 * a collision is on screen: whether one is depends on which cohorts made the
 * cut, and a label that changes with its neighbours is not a name.
 */
function AssetName({
  chainId,
  assetIdU64,
  byAsset,
}: {
  chainId: number;
  assetIdU64: number;
  byAsset: Map<string, AssetOut>;
}) {
  const asset = byAsset.get(assetKey(chainId, assetIdU64));
  return (
    <span
      className="aset__asset"
      title={`publicAssetId ${assetIdU64} — the circuit's name for this asset. One token may be registered under several ids, and withdrawals under different ids do not share an anonymity set.`}
    >
      {/* Falls back to the token address, not to the id: the id is already
          printed beside it, and repeating it would name the row twice while
          still not saying which token it is. */}
      {asset ? assetLabel(asset) : "unknown asset"} <AssetIdTag assetIdU64={assetIdU64} />
      <span className="aset__chain"> · {getChainMeta(chainId).short}</span>
    </span>
  );
}

/**
 * Recency, in its own column. A dormant set's k is real and an anonymity set is
 * all-history by definition, so this is a second fact beside the tone rather
 * than a downgrade of it.
 *
 * A dash when the backend did not report a window: "0 in the last 30d" would
 * say the cohort went quiet, which nobody measured.
 */
function Recency({ set }: { set: AnonymitySet }) {
  if (set.recentCount === null) {
    return (
      <span className="muted" title="The indexer did not report recent activity for this cohort.">
        —
      </span>
    );
  }
  if (isDormant(set)) {
    return (
      <span
        className="aset__dormant"
        title={`No withdrawals at this denomination in the last ${recentLabel}`}
      >
        dormant · none in {recentLabel}
      </span>
    );
  }
  return (
    <span className="muted">
      {set.recentCount.toLocaleString()} in the last {recentLabel}
    </span>
  );
}

interface Props {
  set: AnonymitySet;
  /** The widest cohort drawn, which this row's bar is scaled against. */
  max: number;
  byAsset: Map<string, AssetOut>;
}

/** One denomination: its identity, its cover, its crowd, and how recent it is. */
function CohortRow({ set: r, max, byAsset }: Props) {
  const tone = coverTone(r.count);
  return (
    <tr className={`aset aset--${tone}`}>
      <td>
        <div className="aset__name">
          {/* The raw circuit integer identifies the cohort. It is
              not converted to whole tokens: a denomination is fixed
              while the yield index moves what it is worth, so the
              integer is the only stable name for the set — and it
              is printed in full for the same reason. Abbreviating
              it to "100.0M" would render two neighbouring
              denominations identically, so a card holding two
              distinct cohorts would read as one row drawn twice. */}
          <span className="aset__denom num" title={`publicOut ${r.publicOut}`}>
            {fmtDigits(r.publicOut)}
          </span>
          <AssetName chainId={r.chainId} assetIdU64={r.assetIdU64} byAsset={byAsset} />
        </div>
      </td>
      <td>
        <span className="aset__cover">
          <CoverGlyph tone={tone} />
          <span
            className="aset__k num"
            title={`${plural(r.count, "withdrawal")} at this denomination — at most that many people`}
          >
            {kLabel(r.count)}
          </span>
        </span>
      </td>
      <td>
        <div className="aset__track">
          <div className="aset__bar" style={{ width: `${fill(r.count, max)}%` }} />
        </div>
      </td>
      <td className="tbl__num aset__recent">
        <Recency set={r} />
      </td>
    </tr>
  );
}

export default memo(CohortRow);
