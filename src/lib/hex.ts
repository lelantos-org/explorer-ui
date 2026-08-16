/** Backend returns hex payloads unprefixed; the UI always displays them 0x-prefixed. */
export function withHexPrefix(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

/**
 * Middle-truncated hex for display, e.g. `0x3645b4…2fe9c1`. Values already
 * shorter than the truncated form are returned whole.
 */
export function shortHex(value: string, truncate = 6): string {
  const v = withHexPrefix(value);
  return v.length > truncate * 2 + 2 ? `${v.slice(0, truncate + 2)}…${v.slice(-truncate)}` : v;
}
