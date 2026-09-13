import { memo } from "react";
import { type ScopeGroup, toggleChain } from "@/lib/scope";
import Empty from "@/ui/Empty";
import Skeleton, { BarRow, BarRows } from "@/ui/Skeleton";
import type { YieldIndex } from "./RegistryCells";
import RegistryChain from "./RegistryChain";
import "./AssetRegistry.css";

interface Props {
  groups: ScopeGroup[];
  loading: boolean;
  /** Yield bindings, keyed by asset. `null` while still loading — an asset with
   *  no entry is plain custody, which is a different thing from unknown. */
  yields: YieldIndex | null;
  /** Chain currently pinned by the filter bar, or null for all of them. */
  selected: number | null;
  onSelect?: (chainId: number | null) => void;
}

/**
 * Every asset the pool accepts, grouped under the chain that owns it.
 *
 * Reference material rather than a metric: what a wallet needs before it can
 * shield anything — which tokens are accepted, what each leg costs, whether the
 * custody earns, and which fields the indexer has not resolved yet.
 *
 * Yield lives here as one column rather than as a second table. Yield-bearing
 * assets are a subset of these rows, so listing them separately meant
 * cross-referencing two tables to answer "does this asset earn?".
 */
function AssetRegistry({ groups, loading, yields, selected, onSelect }: Props) {
  if (loading && groups.length === 0) {
    return (
      <Skeleton>
        {/* The chain header, then rows at the five columns' settled widths. */}
        <BarRow widths={["44px", "72px", "60px"]} height={14} />
        <BarRows count={3} widths={["96px", "56px", "44px", "44px", "52px"]} />
      </Skeleton>
    );
  }
  if (groups.length === 0) return <Empty>no assets registered yet</Empty>;

  return (
    <div className="registry">
      {groups.map((group) => (
        <RegistryChain
          key={group.chainId}
          group={group}
          yields={yields}
          pinned={selected === group.chainId}
          onToggle={() => onSelect?.(toggleChain(selected, group.chainId))}
        />
      ))}
      {/* In full under the table, because the column header can only hint at
          it: the wallet shows an annualised rate for these same venues, and a
          reader moving between the two products meets two bare percentages
          that mean different things. */}
      <p className="card__note">
        <strong>Since bound</strong> is total growth since each venue was attached — not an annual
        rate, and not comparable with the wallet’s “pool pays”, which is annualised. A dash is
        unknown, never zero.
      </p>
    </div>
  );
}

export default memo(AssetRegistry);
