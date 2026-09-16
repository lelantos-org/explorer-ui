/**
 * The fills under the flow series.
 *
 * Ids are namespaced by `id` because a page can hold many of these at once —
 * every chain card carries a sparkline — and SVG gradient ids are global to the
 * document, so a repeated one has every instance painting from the first
 * definition.
 */
import { SERIES_COLOR } from "@/charts/series";

interface Props {
  /** Namespace for this instance's ids; see `fillUrl`. */
  id: string;
  /** Which series to define. Defaults to the inflow/outflow pair. */
  series?: readonly ("in" | "out")[];
}

/** Colour and peak opacity per series. Each fades to fully transparent at the
 *  baseline, so a filled area never hides the gridlines under it. */
const STOPS: Record<"in" | "out", { colour: string; opacity: number }> = {
  in: { colour: SERIES_COLOR.inflow, opacity: 0.34 },
  out: { colour: SERIES_COLOR.outflow, opacity: 0.26 },
};

export default function ChartGradients({ id, series = ["in", "out"] }: Props) {
  return (
    <>
      {series.map((name) => {
        const { colour, opacity } = STOPS[name];
        return (
          <linearGradient key={name} id={`${id}-${name}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity={opacity} />
            <stop offset="100%" stopColor={colour} stopOpacity="0" />
          </linearGradient>
        );
      })}
    </>
  );
}
