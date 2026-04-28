import { useState } from "react";

interface Props {
  value: string;
  truncate?: number;
  className?: string;
}

export default function Hex({ value, truncate = 10, className }: Props) {
  const [copied, setCopied] = useState(false);
  const v = value.startsWith("0x") ? value : `0x${value}`;
  const short =
    v.length > truncate * 2 + 2 ? `${v.slice(0, truncate + 2)}…${v.slice(-truncate)}` : v;

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

  return (
    <span
      className={`hex ${className ?? ""}`}
      title={v}
      onClick={onCopy}
      role="button"
      tabIndex={0}
    >
      {copied ? "copied" : short}
    </span>
  );
}
