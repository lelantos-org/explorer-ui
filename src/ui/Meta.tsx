import type { CardMeta } from "./cardMeta";
import { Bar } from "./Skeleton";
import "./Meta.css";

/**
 * A caption, one line under a card's title.
 *
 * On one line the tiers are told apart by tone rather than by stacking: lead
 * and basis in the caption grey, gaps in warn. Under the title rather than
 * opposite it, because the header's far side belongs to the card's legend or
 * its filter, and a right-aligned caption pushed both into a second row.
 *
 * Gaps take the warn tone. They are not errors — an unpriced asset or an
 * unindexed fee is a normal, temporary state — but they are the part that
 * changes what the number above them is worth.
 */
export default function Meta({ lead, basis, gaps, pending }: CardMeta) {
  // A bar at the caption's own line height, so the header does not grow or
  // shrink when the figures land. The word stays for a screen reader.
  if (pending) {
    return (
      <span className="meta meta--pending">
        <Bar width="240px" height={12} />
        <span className="sr-only">{lead}</span>
      </span>
    );
  }
  return (
    <span className="meta">
      <span className="meta__lead">{lead}</span>
      {basis && <span className="meta__basis">{basis}</span>}
      {/* Builders drop the empty gaps, so this only has to ask whether there
          are any — filtering again here would imply they do not. */}
      {gaps && gaps.length > 0 && <span className="meta__gaps">{gaps.join(" · ")}</span>}
    </span>
  );
}
