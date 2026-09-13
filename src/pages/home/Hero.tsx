import { memo } from "react";
import { type Denom, signedFmt, unitShort } from "@/lib/denom";
import { splitMagnitude } from "@/lib/format";
import { Bar } from "@/ui/Skeleton";
import "./Hero.css";

interface Props {
  rangeLabel: string;
  netFlow: number | null;
  /** Unit `netFlow` is expressed in. */
  denom: Denom;
  /** First load: the figure is a placeholder. */
  loading: boolean;
  /** New filters loading over the previous figure. */
  stale: boolean;
}

/** The page masthead: what the page is, and the one headline figure. */
function Hero({ rangeLabel, netFlow, denom, loading, stale }: Props) {
  const pending = loading && netFlow === null;
  const [digits, magnitude] =
    netFlow === null ? ["—", ""] : splitMagnitude(signedFmt(denom)(netFlow));

  return (
    <div className="hero">
      <div className="hero__l">
        <span className="lbl">network observability</span>
        {/* The headline says what the page is for, not the brand name the
            masthead already carries — which told a first-time reader nothing
            about what they were looking at. */}
        <h1 className="hero__t">Everything the pool makes public</h1>
        <p className="hero__lede">
          This is the whole of what an outside observer can see: totals, counts, and the
          denominations withdrawals publish. No senders, no recipients, no balances — those never
          reach the chain.
        </p>
      </div>
      <div className="hero__net">
        <div className="lbl">net flow · {rangeLabel}</div>
        {/* Not toned by sign. The sign already says which way the pool moved,
            and a net outflow is not a warning — it is people withdrawing. */}
        {/* Placeholders at the figure's own size, so the box does not resize
            when it lands. */}
        <div
          className={stale ? "hero__fig hero__fig--stale" : "hero__fig"}
          aria-busy={loading || undefined}
        >
          <div className="hero__val num">
            {pending ? (
              <Bar width="170px" height={34} />
            ) : (
              <>
                {digits}
                {magnitude && <span className="hero__mag">{magnitude}</span>}
              </>
            )}
          </div>
          <div className="hero__unit">
            {pending ? <Bar width="120px" height={11} /> : unitShort(denom)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Hero);
