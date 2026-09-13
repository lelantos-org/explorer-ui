import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { describeFailure } from "@/lib/failure";
import "./Card.css";

interface Props {
  title: string;
  /**
   * The protocol's own name for this card, kept beside the plain-language
   * title rather than in place of it.
   *
   * The terms are not interchangeable for the two readers this page has: one
   * arrives from the docs and searches for "anonymity set", the other has
   * never met the word and should not have to learn it to read a count. Both
   * names shown, the plain one leading, is the only arrangement that serves
   * both — dropping the term would strand the first reader.
   */
  subtitle?: string;
  /** The caption under the title: what the figures cover. See `Meta`. */
  meta?: ReactNode;
  /** Opposite the title: a legend, or a control that scopes this card alone —
   *  in the card's header so it reads as the card's, not the filter bar's. */
  actions?: ReactNode;
  /**
   * How much room the body gives its content. A chart brings its own gutters
   * for the axis labels; a table's header row brings its own top rule.
   */
  variant?: "default" | "chart" | "table";
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
  /**
   * The body shows data for the previous filters while a request for the new
   * ones is in flight. Dimmed rather than swapped for a skeleton: the old
   * figures keep the card's shape and stay readable, and a placeholder flashing
   * in on every range change reads as the page reloading.
   */
  busy?: boolean;
  children: ReactNode;
}

export default function Card({
  title,
  subtitle,
  meta,
  actions,
  variant = "default",
  error,
  busy = false,
  children,
}: Props) {
  return (
    <div
      className={cx("card", `card--${variant}`, busy && "card--busy")}
      aria-busy={busy || undefined}
    >
      <div className="card__h">
        <div className="card__name">
          {/* Plain name and protocol term on one line, so the two read as one
              phrase rather than as a title with a badge stuck under it. */}
          <div className="card__tline">
            <h2 className="card__t">{title}</h2>
            {subtitle && <span className="card__sub">{subtitle}</span>}
          </div>
          {/* The caption summarises the very data that did not arrive, so it
              goes with the body on a failure rather than sitting confidently
              beside it. */}
          {meta && !error && <div className="card__meta">{meta}</div>}
        </div>
        {actions && !error && <div className="card__aside">{actions}</div>}
      </div>
      <div className="card__content">{error ? <CardError message={error} /> : children}</div>
    </div>
  );
}

/**
 * Says the figures are missing, not that they are zero.
 *
 * No retry control: every query on this page polls on the same interval, so
 * the recovery the button would trigger is already scheduled. Saying so is more
 * useful than offering an action that duplicates it.
 *
 * The raw error is transport text ("500 Internal Server Error"), so the reader
 * gets `describeFailure`'s wording and the original stays on hover for whoever
 * is debugging the backend.
 */
function CardError({ message }: { message: string }) {
  const { headline, hint } = describeFailure(message);
  return (
    <div className="card__err" role="status" title={message}>
      <span className="card__err-h">{headline}</span>
      <span className="muted">{hint}</span>
    </div>
  );
}
