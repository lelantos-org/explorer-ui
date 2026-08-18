import { useEffect, useRef, useState } from "react";
import { shortHex, withHexPrefix } from "../../lib/hex";

interface Props {
  value: string;
  truncate?: number;
  className?: string;
}

/** How long the button reads "copied" before returning to the address. */
const COPIED_MS = 900;

/** A hex value, click-to-copy. Shows the middle-truncated form; copies whole. */
export default function Hex({ value, truncate = 10, className }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Unmounting mid-flash would otherwise leave the timer to fire against a
  // component that is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  const full = withHexPrefix(value);

  const onCopy = async (e: React.MouseEvent) => {
    // The rows and cards this sits inside are themselves clickable, and copying
    // an address is not a request to select the row around it.
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      // No clipboard permission, or an insecure origin. The full value is in
      // the title either way, so there is nothing to report.
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  // A real button rather than a span with role="button" — it gets keyboard
  // activation and focus handling for free.
  return (
    <button type="button" className={`hex ${className ?? ""}`} title={full} onClick={onCopy}>
      {copied ? "copied" : shortHex(value, truncate)}
    </button>
  );
}
