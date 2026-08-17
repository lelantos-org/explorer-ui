import type { ReactNode } from "react";

interface Props {
  title: string;
  meta?: ReactNode;
  /** A control that scopes this card alone. Sits beside the meta so it reads
   *  as belonging to the card, not to the page's filter bar. */
  actions?: ReactNode;
  variant?: "default" | "chart";
  children: ReactNode;
}

export default function Card({ title, meta, actions, variant = "default", children }: Props) {
  return (
    <div className={`card ${variant === "chart" ? "card--chart" : ""}`}>
      <div className="card__hdr">
        <h2 className="card__t">{title}</h2>
        {/* Omitted entirely when the card has neither, so the header keeps its
            single-child layout instead of pushing the title against an empty
            box. */}
        {(actions || meta) && (
          <div className="card__aside">
            {actions}
            {meta && <span className="muted">{meta}</span>}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
