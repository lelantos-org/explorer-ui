/**
 * A series' identity, beside the word that names it.
 *
 * Square, because every mark it stands for — a bar, a band, a line's colour —
 * is read by hue, and a rounded dot would read as a status light. Decoration
 * only: the word beside it carries the meaning.
 */
export default function Swatch({ color }: { color: string }) {
  return <span className="swatch" style={{ background: color }} aria-hidden="true" />;
}
