import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./Button.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `ghost` drops the fill, for a secondary action beside other controls. */
  variant?: "default" | "ghost";
}

/** A plain action button. `type="button"` by default — nothing here submits a
 *  form, and the HTML default of `submit` is a trap inside one. */
export default function Button({
  variant = "default",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx("btn", variant === "ghost" && "btn--ghost", className)}
      {...rest}
    />
  );
}
