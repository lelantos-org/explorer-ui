import type { ReactNode } from "react";

interface Props {
  title: string;
  meta?: ReactNode;
  variant?: "default" | "chart";
  children: ReactNode;
}

export default function Card({ title, meta, variant = "default", children }: Props) {
  return (
    <div className={`card ${variant === "chart" ? "card--chart" : ""}`}>
      <div className="card__hdr">
        <h2 className="card__t">{title}</h2>
        {meta && <span className="muted">{meta}</span>}
      </div>
      {children}
    </div>
  );
}
