import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./ScrollTable.css";

interface Props {
  /** Names the scroll stop for assistive tech — it is reachable by Tab. */
  label: string;
  /** Classes for the `<table>` itself. */
  className?: string;
  children: ReactNode;
}

/**
 * A reference table that scrolls sideways when the screen is narrower than it.
 *
 * The wrapper is focusable so it can be scrolled from the keyboard: a region
 * that scrolls but cannot be reached by Tab is unusable without a pointer
 * (WCAG 2.1.1). Every table in the app goes through here, so that exception is
 * written — and suppressed — once.
 */
export default function ScrollTable({ label, className, children }: Props) {
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable to be scrollable without a pointer (WCAG 2.1.1); the rule does not model overflow
    <section className="tbl-wrap" tabIndex={0} aria-label={label}>
      <table className={cx("tbl", className)}>{children}</table>
    </section>
  );
}
