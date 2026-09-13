import type { TxOut } from "@/api";
import { type Cohorts, txPrivacy } from "@/lib/txPrivacy";
import "./PrivacyCell.css";

/**
 * What cover a row got. The tone carries the reading; the title carries why.
 *
 * Only withdrawals publish a denomination, so only they have an anonymity set
 * to report. The rest take the same dash the amount column gives a row it has
 * no figure for — the alternative, scoring them on an axis they are not on,
 * reads as a verdict where there is no measurement.
 */
export default function PrivacyCell({ tx, cohorts }: { tx: TxOut; cohorts: Cohorts }) {
  const privacy = txPrivacy(tx, cohorts);
  if (privacy === null)
    return (
      <span className="muted" title="Only withdrawals publish a denomination.">
        —
      </span>
    );
  return (
    <span className={`priv priv--${privacy.tone}`} title={privacy.title}>
      {privacy.label}
    </span>
  );
}
