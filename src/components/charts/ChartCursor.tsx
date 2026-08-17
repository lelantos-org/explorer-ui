import type { ReactNode } from "react";
import { baselineY, type ChartGeometry, crisp } from "./chartLib";

interface Props {
  geom: ChartGeometry;
  /** Plot x of the hovered point, in chart units. */
  x: number;
  /** Markers on the series the cursor crosses — one per plotted series. */
  children?: ReactNode;
}

/** The vertical line marking the hovered bucket, drawn from the top of the plot
 *  down to the baseline. */
export default function ChartCursor({ geom, x, children }: Props) {
  return (
    <g>
      <line x1={crisp(x)} x2={crisp(x)} y1={geom.pad.t} y2={baselineY(geom)} className="cursor" />
      {children}
    </g>
  );
}
