import { useMemo } from "react";
import type { ChainLocked } from "@/api";
import type { Async } from "@/data/useAsync";
import type { Scope } from "@/domain/scope";
import { fmtTokens, fmtUsd } from "@/lib/format";
import Stat from "@/ui/Stat";
import { heldCaption } from "./meta";
import { heldInScope } from "./summary";

interface Props {
  locked: Async<ChainLocked[]>;
  /** The scope the tiles beside this one cover. */
  scope: Scope;
}

/** What the pool holds in scope: the one headline reading that is a balance
 *  rather than a total over the range. */
export default function HeldStat({ locked, scope }: Props) {
  const held = useMemo(() => heldInScope(locked.data, scope), [locked.data, scope]);
  const value = held?.value ?? null;
  const fmt = held?.unit === "tokens" ? fmtTokens : fmtUsd;
  return (
    <Stat
      label="held in pool"
      value={value === null ? null : fmt(value)}
      caption={heldCaption(held)}
      loading={locked.loading}
    />
  );
}
