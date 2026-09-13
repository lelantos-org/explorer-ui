/**
 * The backend's JSON as it arrives, and the conversions into the types the UI
 * reads.
 *
 * Separate from the client because these are the only places the wire and the
 * app disagree: amounts that travel as decimal strings, and fields a backend
 * that has not been redeployed may omit. Everything else is passed through
 * as-is.
 */
import type {
  AnonymitySet,
  ChainLocked,
  FlowPoint,
  LockedAsset,
  LockedBasis,
  YieldAsset,
} from "../types";

/**
 * A whole-token decimal string as a number.
 *
 * `== null`, not `=== null`: a backend that omits the field entirely would
 * otherwise parse to NaN, which passes every null check downstream and prints
 * "NaN" where a dash belongs.
 */
const amount = (v: string | null | undefined): number | null => (v == null ? null : Number(v));

/**
 * `in`/`out` are whole-token decimal strings, and null unless exactly one asset
 * is in scope — there is no cross-asset token total. USD comes as a plain
 * number: dollar totals stay far below 2^53, so only token amounts need string
 * transport.
 */
export type FlowPointWire = Omit<FlowPoint, "in" | "out"> & {
  in: string | null;
  out: string | null;
};

export const decodeFlows = (rows: FlowPointWire[]): FlowPoint[] =>
  rows.map((r) => ({ ...r, in: amount(r.in), out: amount(r.out) }));

/**
 * `recentCount` is newer than the rest of the row, so a backend that has not
 * been redeployed omits it. Absent becomes `null` — unknown — rather than being
 * left `undefined` for the UI to trip over, and never zero, which would report
 * every cohort dormant on a version skew.
 *
 * `publicOut` stays the string it arrived as: it is a uint64 that must not be
 * parsed.
 */
export type AnonymitySetWire = Omit<AnonymitySet, "recentCount"> & {
  recentCount?: number | null;
};

export const decodeAnonymitySets = (rows: AnonymitySetWire[]): AnonymitySet[] =>
  rows.map((r) => ({ ...r, recentCount: r.recentCount ?? null }));

/**
 * `amount` is a whole-token decimal string for the same reason the flow amounts
 * are: a balance can carry 18 decimals, which JSON numbers cannot hold exactly.
 *
 * `basis` is newer than the rest of the row. Defaulted to `flowDifference`
 * rather than left undefined: that is what such a backend was in fact reporting
 * for every asset, and it is the claim that needs no yield tables to be true.
 */
type LockedAssetWire = Omit<LockedAsset, "amount" | "basis"> & {
  amount: string | null;
  basis?: LockedBasis;
};
export type ChainLockedWire = Omit<ChainLocked, "assets"> & { assets: LockedAssetWire[] };

export const decodeLocked = (rows: ChainLockedWire[]): ChainLocked[] =>
  rows.map((c) => ({
    ...c,
    assets: c.assets.map((a) => ({
      ...a,
      amount: amount(a.amount),
      basis: a.basis ?? "flowDifference",
    })),
  }));

/**
 * Only the whole-token amounts are parsed. The normalized pair and `indexRay`
 * stay strings: they are 78-digit integers that JSON numbers cannot hold, and
 * nothing downstream does arithmetic on them — the index is converted for
 * display in `lib/yield`, from the string.
 */
export type YieldAssetWire = Omit<YieldAsset, "gross" | "idle" | "accruedFee"> & {
  gross: string | null;
  idle: string | null;
  accruedFee: string | null;
};

export const decodeYield = (rows: YieldAssetWire[]): YieldAsset[] =>
  rows.map((r) => ({
    ...r,
    gross: amount(r.gross),
    idle: amount(r.idle),
    accruedFee: amount(r.accruedFee),
  }));
