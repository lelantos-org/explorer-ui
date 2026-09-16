import { getChainMeta } from "@/domain/chains";
import type { ScopeGroup } from "@/domain/scope";
import { cx } from "@/lib/cx";
import { plural } from "@/lib/text";
import AssetLink from "@/ui/AssetLink";
import Empty from "@/ui/Empty";
import ScrollTable from "@/ui/ScrollTable";
import { Fee, Price, Return, type YieldIndex } from "./RegistryCells";

interface Props {
  group: ScopeGroup;
  yields: YieldIndex | null;
  /** Whether this chain is the one the filter bar has pinned. */
  pinned: boolean;
  onToggle?: () => void;
}

/** One chain's block of the registry: a header that scopes the page to it, and
 *  the assets it accepts. */
export default function RegistryChain({ group, yields, pinned, onToggle }: Props) {
  const meta = getChainMeta(group.chainId);

  return (
    <div className={cx("registry__chain", pinned && "registry__chain--on")}>
      <button
        type="button"
        className="registry__hdr"
        aria-pressed={pinned}
        onClick={onToggle}
        title={pinned ? "clear the chain filter" : `filter the page to ${meta.name}`}
      >
        <span className="registry__short">{meta.short}</span>
        <span className="registry__name">{meta.name}</span>
        <span className="muted registry__count">{plural(group.assets.length, "asset")}</span>
        {/* The affordance is worth spelling out: the page is already filtered,
            so nothing about the row itself says it is the thing to click to get
            back. */}
        <span className="registry__hint muted">{pinned ? "clear ×" : "filter"}</span>
      </button>

      {group.assets.length === 0 ? (
        // A chain can report activity while owning no registered assets, so
        // this is a real state rather than a loading one.
        <Empty>no assets registered</Empty>
      ) : (
        <div className="registry__tbl">
          <ScrollTable label={`${meta.name} assets`}>
            <thead>
              <tr>
                <th scope="col">asset</th>
                <th scope="col" className="tbl__num">
                  price
                </th>
                {/* Named by direction rather than by leg: "shield" and
                    "unshield" are the pool's words, "in"/"out" is what a reader
                    is actually deciding between. */}
                <th
                  scope="col"
                  className="tbl__num"
                  title="charged on top of the amount you shield"
                >
                  fee in
                </th>
                <th scope="col" className="tbl__num" title="skimmed from the amount you unshield">
                  fee out
                </th>
                {/* Headed by the period rather than by the measure. The wallet
                    shows an annualised APY for these same venues, and this is
                    growth since binding — two figures that render as the same
                    bare percentage, so anything that only said "return" left a
                    reader moving between the two products no way to tell which
                    they were looking at. Blank for most assets, which is the
                    point: the column says at a glance which of them earn. */}
                <th
                  scope="col"
                  className="tbl__num"
                  title="total return since the venue was bound, for assets whose custody earns — not an annual rate"
                >
                  since bound
                </th>
              </tr>
            </thead>
            <tbody>
              {group.assets.map((a) => (
                <tr key={a.assetIdU64}>
                  <td>
                    <AssetLink asset={a} className="registry__asset" />
                  </td>
                  <td className="tbl__num">
                    <Price usd={a.priceUsd} />
                  </td>
                  <td className="tbl__num">
                    <Fee bps={a.depositBps} />
                  </td>
                  <td className="tbl__num">
                    <Fee bps={a.withdrawBps} />
                  </td>
                  <td className="tbl__num">
                    <Return yields={yields} asset={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        </div>
      )}
    </div>
  );
}
