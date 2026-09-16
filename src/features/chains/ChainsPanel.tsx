import type { ChainFlow } from "@/api";
import type { Async } from "@/data/useAsync";
import Card from "@/ui/Card";
import Meta from "@/ui/Meta";
import ChainFlowGrid from "./ChainFlowGrid";
import { chainsMeta } from "./meta";
import { summarizeChains } from "./summary";

interface Props {
  chainFlows: Async<ChainFlow[]>;
  selected: number | null;
  onSelectChain: (chainId: number | null) => void;
}

/** The chains tab: what moved on each chain in the last 24h. */
export default function ChainsPanel({ chainFlows, selected, onSelectChain }: Props) {
  return (
    <Card
      title="Chain flows · last 24h"
      error={chainFlows.error}
      meta={<Meta {...chainsMeta(summarizeChains(chainFlows.data))} />}
    >
      <ChainFlowGrid data={chainFlows.data} selected={selected} onSelect={onSelectChain} />
    </Card>
  );
}
