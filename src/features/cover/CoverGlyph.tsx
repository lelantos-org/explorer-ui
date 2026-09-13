import type { CoverTone } from "@/lib/cover";
import "./CoverGlyph.css";

/**
 * The second channel for a cover tone, so it is never colour alone.
 *
 * `!` no cover, `~` some, `=` a crowd. Hidden from assistive tech: every place
 * that draws one also prints the k or the tone's name beside it, and
 * "exclamation mark k equals one" is noise.
 */
const GLYPH: Record<CoverTone, string> = { unique: "!", thin: "~", counted: "=" };

export default function CoverGlyph({ tone }: { tone: CoverTone }) {
  return (
    <span className={`glyph glyph--${tone} num`} aria-hidden="true">
      {GLYPH[tone]}
    </span>
  );
}
