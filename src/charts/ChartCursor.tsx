import type { ReactNode } from "react";
import { crisp } from "./chartLib";
import type { PlotFrame } from "./usePlotFrame";

interface Props {
  frame: PlotFrame;
  /** Plot x of the hovered point, in chart units. */
  x: number;
  /** Markers on the series the cursor crosses — one per plotted series. */
  children?: ReactNode;
}

/** The vertical line marking the hovered bucket, drawn from the top of the plot
 *  down to the baseline. */
export default function ChartCursor({ frame, x, children }: Props) {
  return (
    <g>
      <line
        x1={crisp(x)}
        x2={crisp(x)}
        y1={frame.geom.pad.t}
        y2={frame.baseline}
        className="cursor"
      />
      {children}
    </g>
  );
}
