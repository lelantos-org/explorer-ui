import type { ChainLocked, PoolNotes as PoolNotesRow } from "@/api";
import type { Async } from "@/data/useAsync";
import Card from "@/ui/Card";
import Meta from "@/ui/Meta";
import LockedByChain from "./LockedByChain";
import { lockedMeta, poolNotesMeta } from "./meta";
import PoolNotes from "./PoolNotes";
import { summarizeLocked } from "./summary";

interface Props {
  locked: Async<ChainLocked[]>;
  notes: Async<PoolNotesRow[]>;
  selected: number | null;
  onSelectChain: (chainId: number | null) => void;
}

/** The "in the pool" tab: what the pool holds, and the notes committed to it. */
export default function PoolPanel({ locked, notes, selected, onSelectChain }: Props) {
  // Once, so the caption's total and the chips' denominator are one figure.
  const summary = summarizeLocked(locked.data);
  return (
    <>
      <Card
        title="Held in the pool"
        subtitle="escrowed by chain"
        error={locked.error}
        meta={<Meta {...lockedMeta(summary)} />}
      >
        <LockedByChain
          data={locked.data}
          totalUsd={summary?.totalUsd ?? null}
          loading={locked.loading}
          selected={selected}
          onSelect={onSelectChain}
        />
      </Card>

      <Card
        title="Notes in the tree"
        subtitle="pool notes"
        error={notes.error}
        meta={<Meta {...poolNotesMeta(notes.data)} />}
      >
        <PoolNotes
          data={notes.data}
          loading={notes.loading}
          selected={selected}
          onSelect={onSelectChain}
        />
      </Card>
    </>
  );
}
