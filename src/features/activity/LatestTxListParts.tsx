import type { SkeletonCell } from "@/ui/SkeletonRows";

/** The column headings, shared by the table and its placeholder. */
export function FeedHead() {
  return (
    <thead>
      <tr>
        <th scope="col">age</th>
        <th scope="col">kind</th>
        <th scope="col">chain</th>
        <th scope="col">asset</th>
        <th scope="col">block</th>
        <th scope="col" className="tbl__num">
          amount
        </th>
        <th scope="col" className="tbl__num">
          privacy
        </th>
        <th scope="col" className="tbl__num">
          tx
        </th>
      </tr>
    </thead>
  );
}

/** Why only withdrawals carry a cover figure. Static, so it is under the
 *  placeholder too and the card does not grow when the rows land. */
export function FeedNote() {
  return (
    <p className="card__note">
      Only withdrawals publish a denomination, so only they carry a cover figure. A transfer moves
      no public value — there is nothing to count.
    </p>
  );
}

/** Age, kind badge, chain, asset, block, amount, cover, hash — at the badge's
 *  line height, which is what sets a real row's height. */
export const FEED_SKELETON_CELLS: SkeletonCell[] = [
  { width: "32px", lines: [{ line: 24.9, bar: 12 }] },
  { width: "84px", lines: [{ line: 24.9, bar: 20 }] },
  { width: "40px", lines: [{ line: 24.9, bar: 12 }] },
  { width: "88px", lines: [{ line: 24.9, bar: 12 }] },
  { width: "96px", lines: [{ line: 24.9, bar: 12 }] },
  { width: "56px", lines: [{ line: 24.9, bar: 12 }], end: true },
  { width: "48px", lines: [{ line: 24.9, bar: 12 }], end: true },
  { width: "112px", lines: [{ line: 24.9, bar: 12 }], end: true },
];
