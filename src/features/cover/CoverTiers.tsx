import { memo } from "react";
import type { AnonymitySet } from "@/api";
import { cx } from "@/lib/cx";
import Stat, { StatGrid } from "@/ui/Stat";
import CoverGlyph from "./CoverGlyph";
import { TIERS, tally } from "./tiers";
import "./CoverTiers.css";

/** How many denominations sit in each tier, with what that tier means. */
interface Props {
  data: AnonymitySet[] | null;
  loading: boolean;
}

function CoverTiers({ data, loading }: Props) {
  const counts = data ? tally(data) : null;

  return (
    <StatGrid>
      {TIERS.map((tier) => {
        const n = counts?.[tier.tone] ?? null;
        // The tone's border only when the tier has members: an empty "unique"
        // tile in red is an alarm about nothing. Covered never needs one.
        const flagged = n !== null && n > 0 && tier.tone !== "counted";
        return (
          <Stat
            key={tier.tone}
            label={`${tier.name} · ${tier.bound}`}
            labelClassName={`tier__lbl tier__lbl--${tier.tone}`}
            marker={<CoverGlyph tone={tier.tone} />}
            value={n?.toLocaleString() ?? null}
            loading={loading}
            staticCaption
            stale={loading && data !== null}
            caption={<span className="tier__gloss">{tier.gloss}</span>}
            className={cx(flagged && `tier--flag tier--${tier.tone}`)}
          />
        );
      })}
    </StatGrid>
  );
}

export default memo(CoverTiers);
