import type { FlowRow } from "./flows";
import { hex, type Rng } from "./rng";

/**
 * A merkle tree insertion event.
 *
 * Mock-internal: the UI reads the classified `getRecentTransactions` feed, not
 * raw advances, so this type never crosses the `ExplorerApi` boundary. The mock
 * still synthesises them because the feed is derived from them, the same way
 * the real backend derives it.
 */
export interface TreeAdvance {
  chainId: number;
  blockNumber: number;
  logIndex: number;
  startIndex: number;
  inserted: number;
  oldRootHex: string;
  newRootHex: string;
  txHashHex: string;
  blockTs: number;
}

export function buildTreeAdvances(rng: Rng, flows: FlowRow[]): TreeAdvance[] {
  // Group by hourly bucket, total tx per chain per hour.
  const byHour = new Map<string, { ts: number; chainId: number; tx: number }>();
  for (const f of flows) {
    const key = `${f.chainId}:${f.ts}`;
    const cur = byHour.get(key);
    if (cur) cur.tx += f.txCount;
    else byHour.set(key, { ts: f.ts, chainId: f.chainId, tx: f.txCount });
  }

  const buckets = [...byHour.values()].sort((a, b) => a.ts - b.ts);

  const out: TreeAdvance[] = [];
  const startIndexByChain = new Map<number, number>();
  const blockByChain = new Map<number, number>();
  const rootByChain = new Map<number, string>();

  for (const b of buckets) {
    if (b.tx === 0) continue;
    // Split tx into 2-6 log entries per hour for that chain.
    const entries = 2 + Math.floor(rng() * 5);
    let remaining = b.tx;
    let block = blockByChain.get(b.chainId) ?? 19_500_000 + b.chainId * 1000;
    let startIndex = startIndexByChain.get(b.chainId) ?? 0;
    let prevRoot = rootByChain.get(b.chainId) ?? hex(rng, 32);

    for (let e = 0; e < entries && remaining > 0; e++) {
      const isLast = e === entries - 1;
      const inserted = isLast ? remaining : Math.max(1, Math.floor(remaining / (entries - e)));
      remaining -= inserted;
      const newRoot = hex(rng, 32);
      out.push({
        chainId: b.chainId,
        blockNumber: block,
        logIndex: e,
        startIndex,
        inserted,
        oldRootHex: prevRoot,
        newRootHex: newRoot,
        txHashHex: hex(rng, 32),
        blockTs: b.ts + Math.floor((e * 3600) / entries) + Math.floor(rng() * 60),
      });
      prevRoot = newRoot;
      startIndex += inserted;
      block += 1 + Math.floor(rng() * 30);
    }

    blockByChain.set(b.chainId, block);
    startIndexByChain.set(b.chainId, startIndex);
    rootByChain.set(b.chainId, prevRoot);
  }

  return out.sort((a, b) => a.blockTs - b.blockTs);
}
