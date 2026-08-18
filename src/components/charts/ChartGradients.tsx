/**
 * The fills under the flow series.
 *
 * Ids are namespaced by `id` because a page can hold many of these at once —
 * every chain card carries a sparkline — and SVG gradient ids are global to the
 * document, so a repeated one has every instance painting from the first
 * definition.
 */

/** Gradient id for a series within a namespace, as `url(#…)` wants it. */
export const fillUrl = (id: string, series: "in" | "out" | "tx") => `url(#${id}-${series})`;

interface Props {
  /** Namespace for this instance's ids; see `fillUrl`. */
  id: string;
  /** Which series to define. Defaults to the inflow/outflow pair. */
  series?: readonly ("in" | "out" | "tx")[];
}

/** Colour and peak opacity per series. Each fades to fully transparent at the
 *  baseline, so a filled area never hides the gridlines under it. */
const STOPS: Record<"in" | "out" | "tx", { colour: string; opacity: number }> = {
  in: { colour: "var(--accent)", opacity: 0.45 },
  out: { colour: "var(--warn)", opacity: 0.3 },
  tx: { colour: "var(--accent)", opacity: 0.35 },
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
