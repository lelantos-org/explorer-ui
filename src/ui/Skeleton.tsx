import type { ReactNode } from "react";
import "./Skeleton.css";

/**
 * A placeholder region, shown while a card's first response is in flight.
 *
 * Shaped like the content it stands in for rather than centred text: the card
 * then keeps its height as the data lands, so the page below it does not jump.
 * That is the whole reason to prefer this over "loading…" — a word costs a
 * reflow of everything beneath it the moment the rows arrive.
 *
 * **First load only.** Every caller guards on `loading && !data`, so a
 * background refetch — the page re-reads the backend every 30s — leaves the
 * current rows on screen. Dropping that guard would strobe the whole page twice
 * a minute.
 *
 * Announced once, as a region, rather than leaving a screen reader to walk a
 * pile of decorative bars.
 */
export default function Skeleton({
  children,
  className = "sk",
}: {
  children: ReactNode;
  /** Layout for the region. Defaults to the stacked-rows shape; a caller whose
   *  placeholders are not rows passes its own grid instead, so every loading
   *  region is announced the same way regardless of how it is laid out. */
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-label="loading" aria-busy="true">
      {children}
    </div>
  );
}

/**
 * One shimmering bar.
 *
 * `width` takes any CSS length so a caller can mirror the column it replaces;
 * uneven widths are deliberate, since a grid of identical blocks reads as a
 * broken layout where ragged ones read as text.
 */
export function Bar({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return <span className="sk__bar" style={{ width, height }} aria-hidden="true" />;
}

/** A row of bars, at the widths the real row's columns settle at. */
export function BarRow({ widths, height }: { widths: string[]; height?: number }) {
  return (
    <div className="sk__row">
      {widths.map((width, i) => (
        // Widths are a fixed layout description, not data: nothing reorders or
        // filters them, so the index is a stable identity here.
        // biome-ignore lint/suspicious/noArrayIndexKey: positional by definition
        <Bar key={i} width={width} height={height} />
      ))}
    </div>
  );
}

/** `count` rows of the same shape, for a table or a feed. */
export function BarRows({
  count,
  widths,
  height,
}: {
  count: number;
  widths: string[];
  height?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional by definition
        <BarRow key={i} widths={widths} height={height} />
      ))}
    </>
  );
}

/** One line of a placeholder cell: the line box the real content occupies, and
 *  the bar drawn inside it. */
export interface SkeletonLine {
  /** Height of the real line, in px — its font size times its line height. */
  line: number;
  /** Height of the bar drawn in it. */
  bar: number;
}

export interface SkeletonCell {
  width: string;
  /** Stacked lines, for a cell that holds two (a name over its asset). */
  lines?: SkeletonLine[];
  /** Right-aligned, like the numeric column it stands in for. */
  end?: boolean;
}

const ONE_LINE: SkeletonLine[] = [{ line: 22, bar: 12 }];

/**
 * Placeholder rows for a real table's `<tbody>`.
 *
 * Drawn inside the table itself rather than as free-floating bars, so the
 * columns, the padding and the row rules are the table's own — each row is the
 * height the real one will be, and nothing below moves when the data lands.
 */
export function SkeletonRows({ rows, cells }: { rows: number; cells: SkeletonCell[] }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional by definition
        <tr key={r} className="sk-tr">
          {cells.map((cell, c) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional by definition
            <td key={c} className={cell.end ? "tbl__num" : undefined}>
              {(cell.lines ?? ONE_LINE).map((l, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional by definition
                  key={i}
                  className={cell.end ? "sk-line sk-line--end" : "sk-line"}
                  style={{ height: l.line }}
                >
                  <Bar width={cell.width} height={l.bar} />
                </span>
              ))}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
