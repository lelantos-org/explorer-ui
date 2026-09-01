import type { ReactNode } from "react";

interface Props {
  title: string;
  meta?: ReactNode;
  /** A control that scopes this card alone. Sits beside the meta so it reads
   *  as belonging to the card, not to the page's filter bar. */
  actions?: ReactNode;
  variant?: "default" | "chart";
  /**
   * The request behind this card failed.
   *
   * Rendered *instead of* `children`, because every section below reports an
   * empty result as a fact about the pool — "nothing escrowed yet", "no chains
   * indexed". Those read as answers, and with the backend unreachable they are
   * answers to a question nobody could ask. `useAsync` exists to keep "still
   * loading", "nothing there" and "the backend is down" apart (see its
   * docstring); dropping the error here is what collapsed the last two back
   * together.
   */
  error?: string | null;
  children: ReactNode;
}

export default function Card({
  title,
  meta,
  actions,
  variant = "default",
  error,
  children,
}: Props) {
  return (
    <div className={`card ${variant === "chart" ? "card--chart" : ""}`}>
      <div className="card__hdr">
        <h2 className="card__t">{title}</h2>
        {/* Omitted entirely when the card has neither, so the header keeps its
            single-child layout instead of pushing the title against an empty
            box. */}
        {(actions || meta) && !error && (
          <div className="card__aside">
            {actions}
            {meta && <span className="muted">{meta}</span>}
          </div>
        )}
      </div>
      {error ? <CardError message={error} /> : children}
    </div>
  );
}

/**
 * Says the figures are missing, not that they are zero.
 *
 * No retry control: every query on this page polls on the same 30s interval, so
 * the recovery the button would trigger is already scheduled. Saying so is more
 * useful than offering an action that duplicates it.
 */
function CardError({ message }: { message: string }) {
  return (
    <div className="card__err" role="status">
      <span className="err">could not load this</span>
      <span className="muted">{message}</span>
      <span className="muted card__err-note">retrying every 30s</span>
    </div>
  );
}
