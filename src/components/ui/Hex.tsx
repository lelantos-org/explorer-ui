import { useState } from "react";
import { shortHex, withHexPrefix } from "../../lib/hex";

interface Props {
  value: string;
  truncate?: number;
  className?: string;
}

export default function Hex({ value, truncate = 10, className }: Props) {
  const [copied, setCopied] = useState(false);
  const v = withHexPrefix(value);
  const short = shortHex(value, truncate);

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      /* ignore */
    }
  };

  // A real button rather than a span with role="button" — it gets keyboard
  // activation and focus handling for free.
  return (
    <button type="button" className={`hex ${className ?? ""}`} title={v} onClick={onCopy}>
      {copied ? "copied" : short}
    </button>
  );
}
