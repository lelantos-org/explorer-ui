import { useMemo } from "react";
import type { AssetOut, YieldAsset } from "@/api";
import type { Async } from "@/data/useAsync";
import { indexAssets } from "@/domain/assets";
import { groupsInScope, type Scope, type ScopeGroup } from "@/domain/scope";
import Card from "@/ui/Card";
import { LOADING } from "@/ui/cardMeta";
import Meta from "@/ui/Meta";
import AssetRegistry from "./AssetRegistry";
import { registryMeta } from "./meta";

interface Props {
  assets: Async<AssetOut[]>;
  yields: Async<YieldAsset[]>;
  /** Every chain with its assets, as the scope picker lists them. */
  groups: ScopeGroup[];
  scope: Scope;
  onSelectChain: (chainId: number | null) => void;
}

/**
 * The registry tab. Still the filter bar's subject — the scope picker selects
 * from exactly these rows — so it is the tab a reader lands on after narrowing
 * to a chain they do not recognise.
 */
export default function AssetsPanel({ assets, yields, groups, scope, onSelectChain }: Props) {
  // Chain only: a pinned asset narrows the rest of the page but not this card,
  // which is the list that asset was chosen from.
  const shown = useMemo(() => groupsInScope(groups, scope), [groups, scope]);
  // Keyed once per fetch rather than per row, since the lookup never changes
  // between rows. `null` survives the memo — the registry has to tell "not
  // loaded yet" from "this asset does not earn".
  const yieldIndex = useMemo(
    () => (yields.data === null ? null : indexAssets(yields.data)),
    [yields.data],
  );

  return (
    <Card
      title="Supported assets"
      error={assets.error}
      variant="table"
      meta={<Meta {...(assets.data ? registryMeta(shown, yields.data) : LOADING)} />}
    >
      <AssetRegistry
        groups={shown}
        loading={assets.loading}
        yields={yieldIndex}
        selected={scope.chainId}
        onSelect={onSelectChain}
      />
    </Card>
  );
}
