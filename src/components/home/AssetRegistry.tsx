import type { AssetOut, YieldAsset } from "../../api";
import { assetKey } from "../../lib/assets";
import { getChainMeta } from "../../lib/chains";
import { feeDisplay } from "../../lib/fees";
import { fmtGrowth, fmtUsd } from "../../lib/format";
import type { ScopeGroup } from "../../lib/scope";
import { indexGrowth, isPolled } from "../../lib/yield";
import AssetLink from "../ui/AssetLink";
import Skeleton, { BarRow, BarRows } from "../ui/Skeleton";

/** Yield rows by `chainId:assetIdU64`, so a row resolves its own binding
 *  without the registry having to be joined upstream. */
export type YieldIndex = Map<string, YieldAsset>;

interface Props {
  groups: ScopeGroup[];
  loading: boolean;
  /** Yield bindings, keyed by asset. `null` while still loading — an asset with
   *  no entry is plain custody, which is a different thing from unknown. */
  yields: YieldIndex | null;
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

/**
 * What an asset's custody has earned since its venue was bound.
 *
 * Four states, and they must not collapse into one another:
 *
 * - **bindings not loaded** — nothing at all. The bindings arrive in their own
 *   request, so until it lands this column knows nothing about any asset, and
 *   must not answer for one.
 * - **plain custody** — loaded, and this asset has no binding. Marked, not
 *   dashed: it has no return, which is a different claim from one whose return
 *   is unknown, and every dash elsewhere in this UI means unknown.
 * - **bound, unpolled** — a dash. The binding is event-sourced and the state is
 *   polled, so the gap between them is normal and genuinely unknown.
 * - **polled** — the figure, signed.
 *
 * The first two are the easy pair to conflate: an absent row means "does not
 * earn" only once the request behind it has come back, so the lookup takes the
 * whole index rather than the row it resolves to.
 *
 * Never an annual rate: one current index per asset is stored and overwritten
 * every poll, so there is no period to annualise over. A halt is badged here
 * rather than given a column of its own — it explains why a figure has stopped
 * moving, which is only meaningful next to the figure.
 */
function Return({ yields, asset }: { yields: YieldIndex | null; asset: AssetOut }) {
  if (yields === null) return null;

  const row = yields.get(assetKey(asset.chainId, asset.assetIdU64));
  if (!row) return <span className="registry__plain" title="plain custody — does not earn" />;

  const growth = indexGrowth(row.indexRay);
  return (
    <>
      {growth === null || !isPolled(row) ? (
        <span className="muted" title="bound to a venue, but not polled yet">
          —
        </span>
      ) : (
        <span
          className={`registry__growth ${growth > 0 ? "registry__growth--up" : ""}`}
          title="total return since the venue was bound — not an annual rate"
        >
          {fmtGrowth(growth)}
        </span>
      )}
      {row.halted && (
        <span className="registry__halted" title="accrual is halted; the venue is still bound">
          halted
        </span>
      )}
    </>
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

interface ChainProps {
  group: ScopeGroup;
  yields: YieldIndex | null;
  /** Whether this chain is the one the filter bar has pinned. */
  pinned: boolean;
  onToggle?: () => void;
}

function ChainAssets({ group, yields, pinned, onToggle }: ChainProps) {
  const meta = getChainMeta(group.chainId);
  const count = group.assets.length;

  return (
    <div className={`registry__chain ${pinned ? "registry__chain--on" : ""}`}>
      <button
        type="button"
        className="registry__hdr"
        aria-pressed={pinned}
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
        // Focusable so it can be scrolled from the keyboard: a region that
        // scrolls but cannot be reached by Tab is unusable without a pointer
        // (WCAG 2.1.1). Named so the stop is not anonymous.
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable to be scrollable without a pointer (WCAG 2.1.1); the rule does not model overflow
        <section className="tbl-wrap registry__tbl" tabIndex={0} aria-label={`${meta.name} assets`}>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">asset</th>
                <th scope="col" className="tbl__num">
                  price
                </th>
                {/* Named by direction rather than by leg: "shield" and
                    "unshield" are the pool's words, "in"/"out" is what a
                    reader is actually deciding between. */}
                <th
                  scope="col"
                  className="tbl__num"
                  title="charged on top of the amount you shield"
                >
                  fee in
                </th>
                <th scope="col" className="tbl__num" title="skimmed from the amount you unshield">
                  fee out
                </th>
                {/* Blank for most assets, which is the point: the column says
                    at a glance which of them earn. */}
                <th
                  scope="col"
                  className="tbl__num"
                  title="total return since the venue was bound, for assets whose custody earns — not an annual rate"
                >
                  return
                </th>
              </tr>
            </thead>
            <tbody>
              {group.assets.map((a) => (
                <tr key={a.assetIdU64}>
                  <td>
                    <AssetLink asset={a} />
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
                  <td className="tbl__num">
                    <Return yields={yields} asset={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

/**
 * Every asset the pool accepts, grouped under the chain that owns it.
 *
 * Reference material rather than a metric: what a wallet needs before it can
 * shield anything — which tokens are accepted, what each leg costs, whether the
 * custody earns, and which fields the indexer has not resolved yet.
 *
 * Yield lives here as one column rather than as a second table. Yield-bearing
 * assets are a subset of these rows, so listing them separately meant
 * cross-referencing two tables to answer "does this asset earn?".
 *
 * Fees are per asset and per leg, so they only exist as a table like this;
 * there is no single number a header could carry.
 */
export default function AssetRegistry({ groups, loading, yields, selected, onSelect }: Props) {
  if (loading && groups.length === 0) {
    return (
      <Skeleton>
        {/* The chain header, then rows at the five columns' settled widths. */}
        <BarRow widths={["44px", "72px", "60px"]} height={14} />
        <BarRows count={3} widths={["96px", "56px", "44px", "44px", "52px"]} />
      </Skeleton>
    );
  }
  if (groups.length === 0) return <div className="empty">no assets registered yet</div>;

  return (
    <div className="registry">
      {groups.map((group) => (
        <ChainAssets
          key={group.chainId}
          group={group}
          yields={yields}
          pinned={selected === group.chainId}
          onToggle={() => onSelect?.(selected === group.chainId ? null : group.chainId)}
        />
      ))}
    </div>
  );
}
