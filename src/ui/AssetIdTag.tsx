import { assetIdTag } from "@/lib/assets";
import "./AssetIdTag.css";

/**
 * An asset's circuit id, as it is printed wherever assets are listed together.
 *
 * One component rather than a class repeated in the feed, the cohort table and
 * the escrow chips, because the id is what tells two registrations of one token
 * apart — and it has to read as the same mark in every place that names one.
 * See `assetIdTag` for why the id is never optional.
 */
export default function AssetIdTag({ assetIdU64 }: { assetIdU64: number }) {
  return (
    <span className="asset-id num" title={`publicAssetId ${assetIdU64}`}>
      {assetIdTag(assetIdU64)}
    </span>
  );
}
