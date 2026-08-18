import { useMemo } from "react";
import type { CountPoint } from "../../api";
import { fmtNum, fmtTs } from "../../lib/format";
import type { TimeDomain } from "../../lib/time";
import ChartCursor from "./ChartCursor";
import ChartDot from "./ChartDot";
import ChartEmpty from "./ChartEmpty";
import ChartFrame from "./ChartFrame";
import ChartGradients, { fillUrl } from "./ChartGradients";
import { pathArea, pathLine } from "./chartLib";
import { useChartHover } from "./useChartHover";
import { usePlotFrame } from "./usePlotFrame";

interface Props {
  data: CountPoint[];
  domain?: TimeDomain | null;
  height?: number;
}

const GRADIENT_ID = "txchart";

const tsOf = (d: CountPoint) => d.ts;
const valuesOf = (d: CountPoint) => [d.count];

export default function TxChart({ data, domain, height = 240 }: Props) {
  const { ref, frame } = usePlotFrame(data, { height, domain, tsOf, valuesOf });
  const points = useMemo(
    () => data.map((p) => ({ x: frame.x(p.ts), y: frame.y(p.count), p })),
    [data, frame],
  );
  const { point: hovered, handlers } = useChartHover(frame.geom, points);

  if (data.length === 0) return <ChartEmpty />;

  const legend = (
    <>
      <span className="lg lg--tx">
        <span className="lg__sw" /> tx count
      </span>
      {hovered && (
        <span className="muted chart__tip">
          {fmtTs(hovered.p.ts, frame.span)} ·{" "}
          <span className="accent">{fmtNum(hovered.p.count)}</span> tx
        </span>
      )}
    </>
  );

  return (
    <ChartFrame
      frame={frame}
      containerRef={ref}
      title="Transaction count over time"
      roundY
      defs={<ChartGradients id={GRADIENT_ID} series={["tx"]} />}
      legend={legend}
      {...handlers}
    >
      <path d={pathArea(points, frame.baseline)} fill={fillUrl(GRADIENT_ID, "tx")} />
      <path d={pathLine(points)} className="line line--tx" />

      {/* A single bucket draws a zero-length path, so mark the point itself. */}
      {points.length === 1 && points[0] && <ChartDot x={points[0].x} y={points[0].y} series="in" />}

      {hovered && (
        <ChartCursor frame={frame} x={hovered.x}>
          <ChartDot x={hovered.x} y={hovered.y} series="in" />
        </ChartCursor>
      )}
    </ChartFrame>
  );
}
