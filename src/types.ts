export interface AssetOut {
  chain_id: number;
  asset_id_u64: number;
  token_hex: string;
  scale: string;
  gen_x: string;
  gen_y: string;
}

export interface TreeAdvanceOut {
  chain_id: number;
  block_number: number;
  log_index: number;
  start_index: number;
  inserted: number;
  old_root_hex: string;
  new_root_hex: string;
  tx_hash_hex: string;
  block_ts: number;
}
