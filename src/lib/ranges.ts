export interface Range {
  label: string;
  sec: number;
  bucket: number;
}

export const RANGES: Range[] = [
  { label: "24h", sec: 86400, bucket: 3600 },
  { label: "7d", sec: 7 * 86400, bucket: 6 * 3600 },
  { label: "30d", sec: 30 * 86400, bucket: 86400 },
  { label: "90d", sec: 90 * 86400, bucket: 86400 },
];

export const DEFAULT_RANGE_IDX = 2;
