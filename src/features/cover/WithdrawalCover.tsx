import type { AnonymitySet, AssetOut } from "@/api";
import Card from "@/ui/Card";
import Legend from "@/ui/Legend";
import Meta from "@/ui/Meta";
import CohortTable from "./CohortTable";
import CoverCaveats from "./CoverCaveats";
import CoverTiers from "./CoverTiers";
import { anonymityMeta } from "./meta";
import { TIERS } from "./tiers";
import "./WithdrawalCover.css";

interface Props {
  data: AnonymitySet[] | null;
  /** The registry, to name the asset each denomination belongs to. */
  assets: AssetOut[] | null;
  loading: boolean;
  error: string | null;
}

const LEGEND = TIERS.map((t) => ({ label: t.name, color: t.color }));

/**
 * How much cover a withdrawal actually gets — the one figure on the page that
 * is about a user's privacy rather than the pool's volume.
 *
 * Its own section rather than a card among cards: it needs a paragraph of
 * explanation before the numbers mean anything, and a closing one on what k
 * cannot tell you, and both were too long for a card caption to carry.
 */
export default function WithdrawalCover({ data, assets, loading, error }: Props) {
  return (
    <section className="cover" aria-labelledby="cover-title">
      <div className="cover__head">
        <span className="lbl">withdrawal anonymity</span>
        <h2 className="cover__t" id="cover-title">
          How much cover each amount actually has
        </h2>
        <p className="cover__lede">
          A withdrawal publishes its amount. Everyone who published the same amount is
          indistinguishable from everyone else who did — so the size of that crowd is the privacy.
          This is the one number here worth reading closely.
        </p>
      </div>

      <CoverTiers data={data} loading={loading} />

      <Card
        title="Denominations, thinnest cover first"
        subtitle="anonymity sets"
        error={error}
        busy={loading && data !== null}
        variant="table"
        meta={<Meta {...anonymityMeta(data)} />}
        actions={<Legend items={LEGEND} />}
      >
        <CohortTable data={data} assets={assets} loading={loading} />
      </Card>

      <CoverCaveats />
    </section>
  );
}
