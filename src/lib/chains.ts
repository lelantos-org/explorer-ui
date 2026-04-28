export interface ChainMeta {
  name: string;
  short: string;
}

const REGISTRY: Record<number, ChainMeta> = {
  1: { name: "Ethereum", short: "ETH" },
  10: { name: "Optimism", short: "OP" },
  137: { name: "Polygon", short: "MATIC" },
  8453: { name: "Base", short: "BASE" },
  42161: { name: "Arbitrum", short: "ARB" },
  43114: { name: "Avalanche", short: "AVAX" },
};

export function getChainMeta(chainId: number): ChainMeta {
  return REGISTRY[chainId] ?? { name: `chain-${chainId}`, short: `#${chainId}` };
}
