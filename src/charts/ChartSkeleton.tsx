import { type ChartPad, SERIES_PAD } from "./chartLib";
import "./ChartSkeleton.css";

interface Props {
  /** The height of the svg it stands in for. */
  height: number;
  /** The plot padding of that chart, so the placeholder sits where the plot will. */
  pad?: ChartPad;
}

/**
 * A chart's placeholder while its first response is in flight.
 *
 * Exactly the chart's size — the readout row plus the plot at its padding — so
 * the card does not jump when the series lands. The shape is a quiet wave over
 * dotted gridlines rather than a grey block: it reads as "a chart is coming"
 * without inventing a trend.
 */
export default function ChartSkeleton({ height, pad = SERIES_PAD }: Props) {
  return (
    <div className="chart" role="status" aria-label="loading" aria-busy="true">
      <div className="chart__readout" />
      <div className="chart-sk" style={{ height }} aria-hidden="true">
        <div
          className="chart-sk__plot"
          style={{ top: pad.t, right: pad.r, bottom: pad.b, left: pad.l }}
        />
      </div>
    </div>
  );
}
