interface Props {
  /** The figure: what the card counts, and how much of it there is. */
  lead: string;
  /** What that figure means, where it is open to being misread. */
  basis?: string;
  /** What it leaves out or flags. */
  gaps?: string[];
}

/**
 * A card's caption, stacked by what a reader does with each part.
 *
 * The three tiers exist because a caption answers three questions at once, and
 * a single `·` chain gives them all the same weight: the figure, the definition
 * behind it, and what it leaves out end up indistinguishable, so the last —
 * the only part anyone has to act on — reads as more trailing detail.
 *
 * Right-aligned and stacked rather than run on one line: the header is a flex
 * row with a short title opposite it, and a long single-line caption dominates
 * the title it belongs to and wraps unpredictably on a narrow screen.
 *
 * Gaps take the warn tone. They are not errors — an unpriced asset or an
 * unindexed fee is a normal, temporary state — but they are the part that
 * changes what the number above them is worth.
 */
export default function Meta({ lead, basis, gaps }: Props) {
  return (
    <span className="meta">
      <span className="meta__lead">{lead}</span>
      {basis && <span className="meta__basis">{basis}</span>}
      {/* `gapList` in `meta.ts` drops the empties, so this only has to ask
          whether there are any — filtering again here would imply it does not. */}
      {gaps && gaps.length > 0 && <span className="meta__gaps">{gaps.join(" · ")}</span>}
    </span>
  );
}
