import { plural } from "@/lib/text";
import type { SkeletonCell } from "@/ui/Skeleton";

/** The column structure, shared by the table and its placeholder so both lay
 *  out identically. */
export function CohortHead() {
  return (
    <>
      {/* Fixed columns either side of the bar, so every bar starts and ends
          at the same x and their lengths compare directly. */}
      <colgroup>
        <col className="asets__c-name" />
        <col className="asets__c-cover" />
        <col />
        <col className="asets__c-recent" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">denomination</th>
          <th scope="col">cover</th>
          <th scope="col">relative crowd</th>
          <th scope="col" className="tbl__num">
            recency
          </th>
        </tr>
      </thead>
    </>
  );
}

/** How many rows were left off, and the scale the bars are drawn on. Shown
 *  under the placeholder too, so the card is its final height while loading. */
export function CohortFoot({ hidden }: { hidden: number }) {
  return (
    <div className="aset__foot">
      <span>{hidden > 0 ? `${plural(hidden, "denomination")} with more cover not shown` : ""}</span>
      <span>Linear scale, not log</span>
    </div>
  );
}

/** A placeholder row per visible cohort, at the real rows' line heights: the
 *  denomination over its asset, the cover, the bar, the recency. */
export const COHORT_SKELETON_CELLS: SkeletonCell[] = [
  {
    width: "60%",
    lines: [
      { line: 29, bar: 16 },
      { line: 20, bar: 11 },
    ],
  },
  { width: "72%", lines: [{ line: 24, bar: 14 }] },
  { width: "100%", lines: [{ line: 8, bar: 8 }] },
  { width: "70%", lines: [{ line: 20, bar: 11 }], end: true },
];
