export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface TransactionTokenInfo {
  symbol: string;
  decimals: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string; // amount in wei (for ETH) or token base units
  timestamp: number; // Unix timestamp (seconds)
  status: TransactionStatus;
  token?: TransactionTokenInfo; // present for token transfers
  type: TransactionType;
}
