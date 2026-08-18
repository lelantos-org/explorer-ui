import { useMemo } from "react";
import { type KindCounts, TX_KINDS, type TxKind } from "../../api";
import { fmtNum, fmtTs } from "../../lib/format";
import type { TimeDomain } from "../../lib/time";
import ChartEmpty from "./ChartEmpty";
import ChartFrame from "./ChartFrame";
import { useChartHover } from "./useChartHover";
import { type PlotFrame, usePlotFrame } from "./usePlotFrame";

interface Props {
  data: KindCounts[];
  /** Bucket width in seconds. Bar width comes from this, never from
   *  `data.length`: a range with one active day out of thirty returns a single
   *  bucket, and sizing by count would stretch that one group across the whole
   *  plot. */
  bucketSec: number;
  domain?: TimeDomain | null;
  height?: number;
}

/**
 * The kinds this chart plots.
 *
 * `pending` is left out: it is a transient state, not an outcome. Every pending
 * escrow becomes a `deposit` once the relayer flushes it, so plotting both puts
 * the same escrow on the chart twice — once where it was seen and again where
 * it settled — and the pending bars in older buckets keep shrinking as history
 * catches up. The feed still carries it, and the latest-transactions table
 * still badges it, where it reads as live state rather than as a measurement.
 *
 * Derived from `TX_KINDS` so a kind added to the wire type reaches the chart
 * without a second edit here.
 */
const PLOTTED_KINDS: TxKind[] = TX_KINDS.filter((k) => k !== "pending");

/** Share of a bucket's slot the group of bars occupies; the rest is the gap
 *  between neighbouring buckets. */
const GROUP_FILL = 0.78;
/** Share of its own lane each bar fills, leaving a hairline between bars of the
 *  same bucket. */
const BAR_FILL = 0.84;
/** Bars stay legible when buckets are dense, and stop looking like slabs when
 *  a range holds only a couple of them. */
const MIN_BAR_W = 1;
const MAX_BAR_W = 14;
/** A zero count draws nothing, but a count of 1 on a tall axis must still
 *  leave a visible mark. */
const MIN_BAR_H = 1.5;

const tsOf = (d: KindCounts) => d.ts;
// Grouped, not stacked: the axis fits the tallest single kind, so a short
// series stays readable next to a dominant one.
const valuesOf = (d: KindCounts) => PLOTTED_KINDS.map((k) => d[k]);

interface Bar {
  kind: TxKind;
  value: number;
  x: number;
  /** Height in pixels; 0 for a bucket where the kind saw nothing. */
  h: number;
}

interface Group {
  /** Centre of the group, which is also what the cursor snaps to. */
  x: number;
  bars: Bar[];
  p: KindCounts;
}

/** Bar and lane widths, in pixels. One slot per bucket *duration*, split into a
 *  lane per kind. */
function barLayout(frame: PlotFrame, bucketSec: number) {
  const laneRaw = ((bucketSec / frame.span) * frame.geom.iw * GROUP_FILL) / PLOTTED_KINDS.length;
  // Whole pixels: a fractional width leaves both edges of every bar half-lit,
  // which reads as a soft bar rather than a thin one.
  const barW = Math.round(Math.min(Math.max(laneRaw * BAR_FILL, MIN_BAR_W), MAX_BAR_W));
  const lane = barW / BAR_FILL;
  return { barW, lane, group: lane * PLOTTED_KINDS.length };
}

export default function TxKindsChart({ data, bucketSec, domain, height = 240 }: Props) {
  const { ref, frame } = usePlotFrame(data, { height, domain, tsOf, valuesOf });

  const { groups, barW, group } = useMemo(() => {
    const { barW, lane, group } = barLayout(frame, bucketSec);
    const left = frame.geom.pad.l;
    const right = frame.geom.W - frame.geom.pad.r;

    const groups = data.map((p): Group => {
      // A bucket labelled at its start covers [ts, ts+bucket), so centre the
      // group on the middle of that span rather than on its left edge.
      const centre = frame.x(p.ts + bucketSec / 2);
      // Keep the group inside the plot: the newest bucket is usually only
      // half-elapsed, so its centre can sit past the right edge.
      const gx = Math.min(Math.max(centre - group / 2, left), right - group);
      const bars = PLOTTED_KINDS.map((kind, i): Bar => {
        const value = p[kind];
        return {
          kind,
          value,
          x: Math.round(gx + i * lane + (lane - barW) / 2),
          h: value > 0 ? Math.max(MIN_BAR_H, Math.round(frame.baseline - frame.y(value))) : 0,
        };
      });
      return { x: gx + group / 2, bars, p };
    });

    return { groups, barW, group };
  }, [data, bucketSec, frame]);

  const { point: hovered, handlers } = useChartHover(frame.geom, groups);

  if (data.length === 0) return <ChartEmpty />;

  const legend = (
    <>
      {PLOTTED_KINDS.map((k) => (
        <span key={k} className={`lg lg--${k}`}>
          <span className="lg__sw" /> {k}
        </span>
      ))}
      {hovered && (
        <span className="muted chart__tip">
          {fmtTs(hovered.p.ts, frame.span)} ·{" "}
          {PLOTTED_KINDS.filter((k) => hovered.p[k] > 0)
            .map((k) => `${k} ${fmtNum(hovered.p[k])}`)
            .join(" · ") || "no activity"}
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      frame={frame}
      roundY
      containerRef={ref}
      title="Transactions by kind over time"
      legend={legend}
      {...handlers}
    >
      {/* Band behind the hovered group rather than a cursor line: with four
          bars per bucket a line would land on top of one of them. */}
      {hovered && (
        <rect
          x={hovered.x - group / 2}
          y={frame.geom.pad.t}
          width={group}
          height={frame.geom.ih}
          className="bar__band"
        />
      )}

      {groups.map((g) => (
        <g key={g.p.ts}>
          {g.bars
            .filter((b) => b.h > 0)
            .map((b) => (
              <rect
                key={b.kind}
                x={b.x}
                y={frame.baseline - b.h}
                width={barW}
                height={b.h}
                className={`bar bar--${b.kind}`}
              >
                <title>{`${b.kind}: ${b.value}`}</title>
              </rect>
            ))}
        </g>
      ))}
    </ChartFrame>
  );
}
