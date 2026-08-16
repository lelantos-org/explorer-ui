import { useMemo } from "react";
import { type KindCounts, TX_KINDS, type TxKind } from "../../api";
import { fmtNum, fmtTs } from "../../lib/format";
import { domainSpan, type TimeDomain } from "../../lib/time";
import ChartFrame from "./ChartFrame";
import { baselineY, geometry, resolveDomain, xScale, yScale } from "./chartLib";
import { useChartHover } from "./useChartHover";

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

export default function TxKindsChart({ data, bucketSec, domain, height = 240 }: Props) {
  const view = useMemo(() => {
    const geom = geometry(height);
    const dom = resolveDomain(data, (d) => d.ts, domain);
    const span = domainSpan(dom);
    // Grouped, not stacked: the axis fits the tallest single kind, so a short
    // series stays readable next to a dominant one.
    const max = Math.max(1, ...data.flatMap((d) => PLOTTED_KINDS.map((k) => d[k])));
    const x = xScale(geom, dom);
    const y = yScale(geom, max);
    const baseline = baselineY(geom);

    // One slot per bucket *duration*, split into a lane per kind.
    const laneRaw = ((bucketSec / span) * geom.iw * GROUP_FILL) / PLOTTED_KINDS.length;
    const barW = Math.min(Math.max(laneRaw * BAR_FILL, MIN_BAR_W), MAX_BAR_W);
    const lane = barW / BAR_FILL;
    const group = lane * PLOTTED_KINDS.length;

    const left = geom.pad.l;
    const right = geom.W - geom.pad.r;

    const points = data.map((p) => {
      // A bucket labelled at its start covers [ts, ts+bucket), so centre the
      // group on the middle of that span rather than on its left edge.
      const centre = x(p.ts + bucketSec / 2);
      // Keep the group inside the plot: the newest bucket is usually only
      // half-elapsed, so its centre can sit past the right edge.
      const gx = Math.min(Math.max(centre - group / 2, left), right - group);
      const bars = PLOTTED_KINDS.map((kind, i) => {
        const value = p[kind];
        return {
          kind,
          value,
          x: gx + i * lane + (lane - barW) / 2,
          h: value > 0 ? Math.max(MIN_BAR_H, baseline - y(value)) : 0,
        };
      });
      return { x: gx + group / 2, bars, p };
    });
    return { geom, dom, max, points, barW, baseline, group };
  }, [data, bucketSec, height, domain]);

  const { geom, dom, max, points, barW, baseline, group } = view;
  const { point: hoverPt, handlers } = useChartHover(geom, points);

  if (data.length === 0) return <div className="empty">no data</div>;

  const span = domainSpan(dom);

  const legend = (
    <>
      {PLOTTED_KINDS.map((k) => (
        <span key={k} className={`lg lg--${k}`}>
          <span className="lg__sw" /> {k}
        </span>
      ))}
      {hoverPt && (
        <span className="muted chart__tip">
          {fmtTs(hoverPt.p.ts, span)} ·{" "}
          {PLOTTED_KINDS.filter((k) => hoverPt.p[k] > 0)
            .map((k) => `${k} ${fmtNum(hoverPt.p[k])}`)
            .join(" · ") || "no activity"}
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      geom={geom}
      domain={dom}
      max={max}
      roundY
      title="Transactions by kind over time"
      legend={legend}
      {...handlers}
    >
      {/* Band behind the hovered group rather than a cursor line: with four
          bars per bucket a line would land on top of one of them. */}
      {hoverPt && (
        <rect
          x={hoverPt.x - group / 2}
          y={geom.pad.t}
          width={group}
          height={geom.ih}
          className="bar__band"
        />
      )}

      {points.map((pt) => (
        <g key={pt.p.ts}>
          {pt.bars.map((b) =>
            b.h > 0 ? (
              <rect
                key={b.kind}
                x={b.x}
                y={baseline - b.h}
                width={barW}
                height={b.h}
                className={`bar bar--${b.kind}`}
              >
                <title>{`${b.kind}: ${b.value}`}</title>
              </rect>
            ) : null,
          )}
        </g>
      ))}
    </ChartFrame>
  );
}
