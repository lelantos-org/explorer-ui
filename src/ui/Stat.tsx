import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Bar } from "./Skeleton";
import "./Stat.css";

interface Props {
  label: string;
  /** Beside the label: a series swatch or a tone glyph — the tile's key. */
  marker?: ReactNode;
  /** The figure, already formatted. `null` is unknown: a placeholder bar while
   *  `loading`, a dash once the request has settled without one. */
  value: string | null;
  /** Under the figure: its unit, or what it means. */
  caption: ReactNode;
  /** Extra classes for the tile, for a tone or a highlight. */
  className?: string;
  /** Extra classes for the label, when the tone colours it. */
  labelClassName?: string;
  /** The first response is in flight: the figure and caption are placeholders. */
  loading?: boolean;
  /** The caption does not depend on the data — an explanation rather than a
   *  unit — so it stays up while the figure loads. */
  staticCaption?: boolean;
  /** The figure belongs to the previous filters while the new ones load. */
  stale?: boolean;
}

/**
 * One headline reading: a label, the figure, and what it is measured in.
 *
 * No hover and no click. They are readings, not controls, and a tile that
 * lights up under the pointer promises an action that does nothing.
 */
export default function Stat({
  label,
  marker,
  value,
  caption,
  className,
  labelClassName,
  loading = false,
  staticCaption = false,
  stale = false,
}: Props) {
  const pending = loading && value === null;
  return (
    <div className={cx("stat", stale && "stat--stale", className)} aria-busy={loading || undefined}>
      <div className="stat__head">
        {marker}
        <span className={cx("lbl", labelClassName)}>{label}</span>
      </div>
      {/* Placeholders at the figure's and the caption's own line heights, so the
          tile is the same size before and after its data lands. */}
      <div className="stat__val num">
        {pending ? <Bar width="46%" height={26} /> : (value ?? "—")}
      </div>
      <div className="stat__cap">
        {pending && !staticCaption ? <Bar width="62%" height={11} /> : caption}
      </div>
    </div>
  );
}

/** A row of `Stat`s, three across unless `columns` says four; one column on a
 *  phone. Four fold to two on a tablet, where a quarter-width tile is too
 *  narrow for its caption. */
export function StatGrid({ columns = 3, children }: { columns?: 3 | 4; children: ReactNode }) {
  return <div className={cx("stats", columns === 4 && "stats--4")}>{children}</div>;
}
