import type { TxKind } from "@/api";

/**
 * The colour of each plotted series, as the token that holds it.
 *
 * Inflow and outflow wear the deposit and withdraw hues — the same event in the
 * same colour on every chart, legend, tile and badge — so they are spelled here
 * once rather than as `var(--…)` strings wherever a key is drawn.
 */
export const kindColor = (kind: TxKind): string => `var(--kind-${kind})`;

export const SERIES_COLOR = {
  inflow: kindColor("deposit"),
  outflow: kindColor("withdraw"),
  /** A count with no series of its own. */
  neutral: "var(--fg-mute)",
} as const;
