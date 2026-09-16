import type { AssetOut, YieldAsset } from "../../types";
import { type FlowRow, netByAsset } from "../generate/flows";
import { cycle } from "../generate/rng";

/** The pool's own RAY. Index values are 28-digit integers on the wire, so the
 *  arithmetic that produces them runs in `bigint` rather than through floats. */
const RAY = 10n ** 27n;
const BPS = 10_000n;

/**
 * The venue bindings the mock hands out, cycled over the yield-bearing assets.
 *
 * Chosen to cover the states the card has to render rather than to be
 * realistic: a plain earning asset, a zero-buffer one (everything in the venue),
 * a halted one, and one bound but never polled. Each is a state the backend can
 * genuinely be in, and none of them is reachable from the generated flows alone.
 */
interface Binding {
  bufferBps: number;
  perfBps: number;
  /** Growth the index has accumulated since the binding, in bps. */
  growthBps: number;
  halted: boolean;
  /** Whether the poller has ever reached this asset. */
  polled: boolean;
}

const BINDINGS: readonly [Binding, ...Binding[]] = [
  { bufferBps: 500, perfBps: 1_000, growthBps: 342, halted: false, polled: true },
  { bufferBps: 0, perfBps: 2_000, growthBps: 1_180, halted: false, polled: true },
  { bufferBps: 250, perfBps: 500, growthBps: 61, halted: true, polled: true },
  { bufferBps: 1_000, perfBps: 1_000, growthBps: 0, halted: false, polled: false },
];

/** Every third asset earns, so the card is a subset of the registry rather than
 *  all of it — which is what makes the escrow card's two bases distinguishable. */
const YIELD_EVERY = 3;

/** A venue address, derived from the token so it is stable across runs without
 *  drawing from the generator's rng. */
function venueFor(tokenHex: string): string {
  return `${tokenHex.slice(4)}beef`;
}

/**
 * One asset's polled state, in base units.
 *
 * Built the way the pool builds it, so the figures reconcile the way the real
 * ones do: holders' units are minted against what they deposited, the protocol's
 * cut of the growth is minted to the treasury as more units, and `gross` is the
 * whole supply revalued at the index. `accruedFee` then comes back out by the
 * contract's own `n * gross / supply` — not by multiplying through the index,
 * which rounds differently.
 */
function polledState(netBase: bigint, perfBps: bigint, growthBps: bigint) {
  const indexRay = RAY + (RAY * growthBps) / BPS;
  // The treasury's cut of the growth, minted as units rather than moved as
  // tokens — which is why no flow records it.
  const accruedNorm = (netBase * growthBps * perfBps) / (BPS * BPS);
  const totalNorm = netBase;
  const supply = totalNorm + accruedNorm;
  const gross = supply === 0n ? 0n : (supply * indexRay) / RAY;
  const accruedFee = supply === 0n ? null : (accruedNorm * gross) / supply;
  return { indexRay, totalNorm, accruedNorm, supply, gross, accruedFee };
}

/**
 * Yield-bearing assets, mirroring `/v1/yield`.
 *
 * Only assets with resolved decimals and a positive balance are bound: the
 * backend can report a bound asset with unknown decimals, but the mock's job
 * here is to make the card's ordinary case reachable offline, and the null-heavy
 * cases are covered by the unpolled binding above.
 */
export function yieldAssets(assets: AssetOut[], flows: FlowRow[], now: number): YieldAsset[] {
  const net = netByAsset(flows);
  const out: YieldAsset[] = [];

  assets.forEach((asset, i) => {
    if (i % YIELD_EVERY !== 0) return;
    if (asset.decimals === null) return;
    const netTokens = net.get(asset.assetIdU64)?.net;
    if (netTokens === undefined || netTokens <= 0) return;

    const binding = cycle(BINDINGS, out.length);
    const scale = 10 ** asset.decimals;
    const toTokens = (v: bigint) => Number(v) / scale;
    const netBase = BigInt(Math.round(netTokens * scale));
    const { indexRay, totalNorm, accruedNorm, gross, accruedFee } = polledState(
      netBase,
      BigInt(binding.perfBps),
      BigInt(binding.growthBps),
    );

    const bound = {
      chainId: asset.chainId,
      assetIdU64: asset.assetIdU64,
      tokenHex: asset.tokenHex,
      symbol: asset.symbol,
      venueHex: venueFor(asset.tokenHex),
      bufferBps: binding.bufferBps,
      perfBps: binding.perfBps,
      halted: binding.halted,
    };

    // A binding with no poll behind it yet: the event-sourced half only, which
    // is exactly the shape the backend serves for a newly added asset.
    if (!binding.polled) {
      out.push({
        ...bound,
        gross: null,
        idle: null,
        accruedFee: null,
        totalNormalized: null,
        accruedFeeNormalized: null,
        indexRay: null,
        blockNumber: null,
        updatedAt: null,
      });
      return;
    }

    out.push({
      ...bound,
      gross: toTokens(gross),
      idle: toTokens((gross * BigInt(binding.bufferBps)) / BPS),
      accruedFee: accruedFee === null ? null : toTokens(accruedFee),
      totalNormalized: totalNorm.toString(),
      accruedFeeNormalized: accruedNorm.toString(),
      indexRay: indexRay.toString(),
      blockNumber: 1_000_000 + i,
      // The poll is its own tick, so it lands after the newest flow rather than
      // with it. A minute is enough for the card to age it visibly.
      updatedAt: now - 60,
    });
  });

  return out;
}
