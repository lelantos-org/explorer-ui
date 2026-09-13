import type { AnchorHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./ExternalLink.css";

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> {
  href: string;
  /** `inline` is the mono, accent-coloured link used for a hash or a symbol in
   *  a table; `plain` inherits everything and only adds the new-tab behaviour. */
  variant?: "inline" | "plain";
}

/**
 * A link that leaves the explorer.
 *
 * Always a new tab, and always `noreferrer`: an address page on a block
 * explorer should not learn which view of this one a reader came from, and
 * `noreferrer` implies `noopener`, so the opened page cannot reach back here.
 */
export default function ExternalLink({ variant = "inline", className, ...rest }: Props) {
  return (
    <a
      target="_blank"
      rel="noreferrer"
      className={cx(variant === "inline" && "xlink", className)}
      {...rest}
    />
  );
}
