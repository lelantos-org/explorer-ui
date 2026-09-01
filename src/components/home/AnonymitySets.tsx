import type { AnonymitySet, AssetOut } from "../../api";
import {
  coverTone,
  isDormant,
  kLabel,
  RECENT_WINDOW_SEC,
  thinnestFirst,
} from "../../lib/anonymity";
import { assetIdTag, assetKey, assetLabel, indexAssets } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { fmtBucket, fmtDigits, plural } from "../../lib/format";
import Skeleton, { BarRows } from "../ui/Skeleton";

interface Props {
  data: AnonymitySet[] | null;
  /** Registry, used to name the asset a denomination belongs to. */
  assets: AssetOut[] | null;
  loading: boolean;
}

/**
 * How wide a row's bar is, as a share of the widest cohort on screen.
 *
 * Linear, deliberately. A log scale would make a cohort of 2 look comparable to
 * one of 200, which is the exact comparison this card exists to make legible.
 * A floor keeps the thinnest sets visible rather than collapsing them to a line
 * indistinguishable from zero.
 */
const MIN_FILL = 2;
const fill = (count: number, max: number): number =>
  Math.max(MIN_FILL, (count / Math.max(1, max)) * 100);

/**
 * How many rows the card shows.
 *
 * The full set is fetched — the feed's privacy column joins against all of it —
 * but a pool used off-ladder produces a denomination per withdrawal, and
 * hundreds of rows of k=1 is a scroll, not a finding. Thinnest-first means the
 * ones worth acting on are the ones that survive the cut, and the caption says
 * how many did not.
 */
const VISIBLE_ROWS = 12;

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
      {getChainMeta(chainId).short}
      {" · "}
      {/* Falls back to the token address, not to the id: the id is already
          printed beside it, and repeating it would name the row twice while
          still not saying which token it is. */}
      {asset ? assetLabel(asset) : "unknown asset"}
      <span className="aset__assetid"> {assetIdTag(assetIdU64)}</span>
    </span>
  );
}

/**
 * Withdrawal cohorts, one row per denomination.
 *
 * An HTML bar list rather than an SVG chart: the axis is categorical, the labels
 * are long, and the comparison a reader makes is between adjacent rows rather
 * than across a continuum.
 *
 * Ordered thinnest-first. Ascending by denomination would read more like a
 * ladder, but it buries the rows worth acting on — a set of one is the finding,
 * and it should not need scrolling to.
 */
export default function AnonymitySets({ data, assets, loading }: Props) {
  if (loading && !data) {
    return (
      <Skeleton>
        {/* A cohort row is a label and a bar whose length is the whole point,
            so the placeholder bars run full width rather than sampling one. */}
        <BarRows count={6} widths={["88px", "100%"]} height={14} />
      </Skeleton>
    );
  }
  if (!data || data.length === 0)
    return <div className="empty">no withdrawals with a recorded denomination</div>;

  const byAsset = indexAssets(assets);
  const sorted = [...data].sort(thinnestFirst);
  const rows = sorted.slice(0, VISIBLE_ROWS);
  const hidden = sorted.length - rows.length;
  // Scaled against the widest bar actually drawn, not the widest in the data:
  // a busy rung left off the card would otherwise flatten every visible bar
  // against a maximum the reader cannot see.
  const max = Math.max(...rows.map((r) => r.count));

  return (
    <div className="asets">
      {rows.map((r) => (
        <div
          className={`aset aset--${coverTone(r.count)}`}
          key={`${r.chainId}-${r.assetIdU64}-${r.publicOut}`}
        >
          <div className="aset__hdr">
            {/* The raw circuit integer identifies the cohort. It is not
                converted to whole tokens: a denomination is fixed while the
                yield index moves what it is worth, so the integer is the only
                stable name for the set — and it is printed in full for the same
                reason. Abbreviating it to "100.0M" would render two neighbouring
                denominations identically, so a card holding two distinct
                cohorts would read as one row drawn twice. */}
            <span className="aset__denom mono" title={`publicOut ${r.publicOut}`}>
              {fmtDigits(r.publicOut)}
            </span>
            <AssetName chainId={r.chainId} assetIdU64={r.assetIdU64} byAsset={byAsset} />
            <span
              className="aset__k mono"
              title={`${plural(r.count, "withdrawal")} at this denomination — at most that many people`}
            >
              {kLabel(r.count)}
            </span>
          </div>
          {/* Recency sits beside the bar, not inside the tone. A dormant set's
              k is real and an anonymity set is all-history by definition, so
              this is a second fact rather than a downgrade of the first.
              Omitted entirely when the backend did not report a window — an
              absent row says nothing, where "0 in the last 30d" would say the
              cohort went quiet. */}
          {r.recentCount !== null && (
            <div className="aset__recent">
              {isDormant(r) ? (
                <span
                  className="aset__dormant"
                  title={`No withdrawals at this denomination in the last ${recentLabel}`}
                >
                  dormant
                </span>
              ) : (
                <span className="muted">
                  {r.recentCount.toLocaleString()} in the last {recentLabel}
                </span>
              )}
            </div>
          )}
          <div className="aset__track">
            <div className="aset__bar" style={{ width: `${fill(r.count, max)}%` }} />
          </div>
        </div>
      ))}
      {hidden > 0 && (
        <div className="aset__more muted">
          {plural(hidden, "denomination")} with more cover not shown
        </div>
      )}
    </div>
  );
}
