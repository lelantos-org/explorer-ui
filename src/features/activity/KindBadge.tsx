import type { TxKind } from "@/api";
import { KIND_TITLE } from "@/domain/kinds";
import "./KindBadge.css";

/** A transaction's kind in its series colour — the hue of its bar in the kinds
 *  chart — with the legend's square beside the word, so the two read as one key. */
export default function KindBadge({ kind }: { kind: TxKind }) {
  return (
    <span className={`kind kind--${kind}`} title={KIND_TITLE[kind]}>
      <span className="kind__sq" aria-hidden="true" />
      {kind}
    </span>
  );
}
