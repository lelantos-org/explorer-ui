import type { ReactNode } from "react";
import "./Empty.css";

/**
 * What a panel shows when its query came back with nothing in it.
 *
 * Only for a real, settled "nothing" — a request still in flight renders a
 * `Skeleton`, and a failed one is replaced by `Card`'s error. The wording is
 * the caller's, because "no chains indexed" and "nothing escrowed yet" are
 * different facts about the pool.
 */
export default function Empty({ children = "no data" }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}
