import type { AssetOut } from "@/api";
import { assetLabel } from "@/lib/assets";
import { getTokenUrl } from "@/lib/chains";
import { withHexPrefix } from "@/lib/hex";
import ExternalLink from "./ExternalLink";

/** Everything naming an asset needs. Taken as a shape rather than as `AssetOut`
 *  so any row carrying a token identity can be named — `YieldAsset` is not an
 *  `AssetOut`, and neither should have to be converted to the other to be
 *  labelled the same way. */
export type NamedAsset = Pick<AssetOut, "chainId" | "tokenHex" | "symbol">;

/**
 * An asset's name, linking out to its page on the chain's explorer.
 *
 * The address is the link rather than a column of its own: it identifies the
 * token but nobody reads a truncated hex, and every reason to want it — check
 * the contract, see holders — is a click away on the explorer.
 *
 * `assetLabel` supplies the text, so an asset whose `symbol()` never resolved is
 * named by its short address here exactly as it is everywhere else. Shared so
 * that one asset appearing in two cards is named identically in both.
 */
export default function AssetLink({ asset, className }: { asset: NamedAsset; className?: string }) {
  const label = assetLabel(asset);
  const full = withHexPrefix(asset.tokenHex);
  const url = getTokenUrl(asset.chainId, asset.tokenHex);

  // Local dev chains have no explorer, so the name stays plain text rather than
  // becoming a link into nowhere. The address is still in the tooltip.
  if (!url) {
    return (
      <span className={className} title={full}>
        {label}
      </span>
    );
  }

  return (
    <ExternalLink className={className} href={url} title={`${full} — open on the explorer`}>
      {label}
    </ExternalLink>
  );
}
