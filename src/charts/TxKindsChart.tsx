import { memo, useMemo } from "react";
import type { KindCounts } from "@/api";
import { BAR_R, layoutKindBars } from "@/charts/geometry/kindBars";
import { SERIES_PAD } from "@/charts/geometry/scale";
import { useChartHover } from "@/charts/hooks/useChartHover";
import { usePlotFrame } from "@/charts/hooks/usePlotFrame";
import ChartFrame from "@/charts/primitives/ChartFrame";
import { PLOTTED_KINDS } from "@/domain/kinds";
import { fmtNum } from "@/lib/format";
import { fmtTs, type TimeDomain } from "@/lib/time";
import Empty from "@/ui/Empty";

/** The plot's height in pixels; its skeleton is drawn at the same size. */
export const KINDS_CHART_HEIGHT = 240;

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

const tsOf = (d: KindCounts) => d.ts;
// Grouped, not stacked: the axis fits the tallest single kind, so a short
// series stays readable next to a dominant one.
const valuesOf = (d: KindCounts) => PLOTTED_KINDS.map((k) => d[k]);

function TxKindsChart({ data, bucketSec, domain, height = KINDS_CHART_HEIGHT }: Props) {
  const { ref, frame } = usePlotFrame(data, { height, domain, tsOf, valuesOf, pad: SERIES_PAD });

  const { groups, barW, group } = useMemo(
    () => layoutKindBars(data, frame, bucketSec),
    [data, bucketSec, frame],
  );

  const { point: hovered, handlers } = useChartHover(frame.geom, groups);

  if (data.length === 0) return <Empty />;

  const readout = hovered && (
    <span className="chart__tip">
      {fmtTs(hovered.p.ts, frame.span)} ·{" "}
      {PLOTTED_KINDS.filter((k) => hovered.p[k] > 0)
        .map((k) => `${k} ${fmtNum(hovered.p[k])}`)
        .join(" · ") || "no activity"}
    </span>
  );

  return (
    <ChartFrame
      frame={frame}
      roundY
      containerRef={ref}
      title="Transactions by kind over time"
      readout={readout}
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
                rx={Math.min(BAR_R, barW / 2, b.h / 2)}
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

export default memo(TxKindsChart);
