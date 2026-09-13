import { Bar } from "./Skeleton";

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
