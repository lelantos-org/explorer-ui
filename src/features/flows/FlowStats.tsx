import { memo } from "react";
import { SERIES_COLOR } from "@/charts/series";
import { amountFmt, type Denom, unitShort } from "@/domain/denom";
import { joinMeta } from "@/lib/text";
import Stat, { StatGrid } from "@/ui/Stat";
import Swatch from "@/ui/Swatch";

interface Props {
  inflow: number | null;
  outflow: number | null;
  commitments: number | null;
  /** The window the count covers. */
  rangeLabel: string;
  /** Unit of the amount tiles; the count tile is always a plain number. */
  denom: Denom;
  /** Scope the count actually covers, when it is wider than the amounts'. The
   *  count endpoint takes no asset, so a pinned asset narrows the flow tiles and
   *  not this one — unsaid, the row reads as one asset's transactions. */
  countScope?: string;
  /** First load: every tile is a placeholder. */
  loading: boolean;
  /** New filters loading over the previous figures. */
  stale: boolean;
}

/** The headline readings under the masthead. Each swatch is the hue its series
 *  wears in the chart below, so the row doubles as that chart's key. */
function FlowStats({
  inflow,
  outflow,
  commitments,
  rangeLabel,
  denom,
  countScope,
  loading,
  stale,
}: Props) {
  const fmtAmount = amountFmt(denom);
  const amount = (v: number | null) => (v === null ? null : fmtAmount(v));
  const state = { loading, stale };
  const unit = unitShort(denom);

  return (
    <StatGrid>
      <Stat
        label="inflow"
        marker={<Swatch color={SERIES_COLOR.inflow} />}
        value={amount(inflow)}
        caption={unit}
        {...state}
      />
      <Stat
        label="outflow"
        marker={<Swatch color={SERIES_COLOR.outflow} />}
        value={amount(outflow)}
        caption={unit}
        {...state}
      />
      {/* "Committed", not "in the tree": this is what the range added, and the
          tree's own size is per chain and never summed — that is the pool tab's
          card. Grouped in full rather than abbreviated: a count is read for its
          exact value, and "184.4k" is a magnitude. */}
      <Stat
        label="notes committed"
        marker={<Swatch color={SERIES_COLOR.neutral} />}
        value={commitments?.toLocaleString() ?? null}
        caption={joinMeta([`commitments in ${rangeLabel}`, countScope])}
        {...state}
      />
    </StatGrid>
  );
}

/** Memoised: its props are primitives, and the page re-renders on every poll. */
export default memo(FlowStats);
