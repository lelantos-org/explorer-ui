import type { AssetOut, YieldAsset } from "@/api";
import { assetKey } from "@/lib/assets";
import { feeDisplay } from "@/lib/fees";
import { fmtGrowth, fmtUsd } from "@/lib/format";
import { indexGrowth, isPolled } from "@/lib/yield";

/** Yield rows by `chainId:assetIdU64`, so a row resolves its own binding
 *  without the registry having to be joined upstream. */
export type YieldIndex = Map<string, YieldAsset>;

/**
 * A rate. Its tone is the state `feeDisplay` already decided, so the three
 * cases are classified in one place rather than again here.
 */
export function Fee({ bps }: { bps: number | null }) {
  const { state, text, title } = feeDisplay(bps);
  return (
    <span className={`fee fee--${state}`} title={title}>
      {text}
    </span>
  );
}

/** Spot price, or a marked gap. Absence is the provider's, not the pool's. */
export function Price({ usd }: { usd: number | null }) {
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
export function Return({ yields, asset }: { yields: YieldIndex | null; asset: AssetOut }) {
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
          className={growth > 0 ? "registry__growth registry__growth--up" : "registry__growth"}
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
