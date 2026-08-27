import { withHexPrefix } from "./hex";

export interface ChainMeta {
  name: string;
  short: string;
  /**
   * Block-explorer origin, no trailing slash. One base rather than a URL per
   * link kind: every explorer here follows the same `/tx/` and `/token/`
   * layout, so a second field would only be a place for the two to drift.
   * Absent for local dev nodes, which have no explorer to link out to.
   */
  explorer?: string;
}

const REGISTRY: Record<number, ChainMeta> = {
  1: { name: "Ethereum", short: "ETH", explorer: "https://etherscan.io" },
  10: { name: "Optimism", short: "OP", explorer: "https://optimistic.etherscan.io" },
  137: { name: "Polygon", short: "MATIC", explorer: "https://polygonscan.com" },
  8453: { name: "Base", short: "BASE", explorer: "https://basescan.org" },
  42161: { name: "Arbitrum", short: "ARB", explorer: "https://arbiscan.io" },
  43114: { name: "Avalanche", short: "AVAX", explorer: "https://snowtrace.io" },
  // Local dev nodes — no public explorer to link out to.
  1337: { name: "Local", short: "LOCAL" },
  31337: { name: "Anvil", short: "ANVIL" },
};

export function getChainMeta(chainId: number): ChainMeta {
  return REGISTRY[chainId] ?? { name: `chain-${chainId}`, short: `#${chainId}` };
}

export function getTxUrl(chainId: number, txHashHex: string): string | null {
  const meta = getChainMeta(chainId);
  if (!meta.explorer) return null;
  return `${meta.explorer}/tx/${withHexPrefix(txHashHex)}`;
}

/**
 * The explorer's page for an ERC20.
 *
 * `/token/` rather than `/address/`: every explorer here renders the token
 * view — supply, holders, transfers — which is what someone following a symbol
 * out of the registry is looking for, and it falls back to the plain address
 * view on its own when the contract is not a token.
 */
export function getTokenUrl(chainId: number, tokenHex: string): string | null {
  const meta = getChainMeta(chainId);
  if (!meta.explorer) return null;
  return `${meta.explorer}/token/${withHexPrefix(tokenHex)}`;
}
