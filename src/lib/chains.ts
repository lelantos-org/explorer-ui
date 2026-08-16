import { withHexPrefix } from "./hex";

export interface ChainMeta {
  name: string;
  short: string;
  explorerTx?: string;
}

const REGISTRY: Record<number, ChainMeta> = {
  1: { name: "Ethereum", short: "ETH", explorerTx: "https://etherscan.io/tx/" },
  10: { name: "Optimism", short: "OP", explorerTx: "https://optimistic.etherscan.io/tx/" },
  137: { name: "Polygon", short: "MATIC", explorerTx: "https://polygonscan.com/tx/" },
  8453: { name: "Base", short: "BASE", explorerTx: "https://basescan.org/tx/" },
  42161: { name: "Arbitrum", short: "ARB", explorerTx: "https://arbiscan.io/tx/" },
  43114: { name: "Avalanche", short: "AVAX", explorerTx: "https://snowtrace.io/tx/" },
  // Local dev nodes — no public explorer to link out to.
  1337: { name: "Local", short: "LOCAL" },
  31337: { name: "Anvil", short: "ANVIL" },
};

export function getChainMeta(chainId: number): ChainMeta {
  return REGISTRY[chainId] ?? { name: `chain-${chainId}`, short: `#${chainId}` };
}

export function getTxUrl(chainId: number, txHashHex: string): string | null {
  const meta = getChainMeta(chainId);
  if (!meta.explorerTx) return null;
  return `${meta.explorerTx}${withHexPrefix(txHashHex)}`;
}
