// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// User types
export interface User {
  id: string;
  username: string | null;
  primaryAddress: string;
  createdAt: string;
}

// Wallet types
export interface Wallet {
  address: string;
  name: string;
  index: number;
  isActive: boolean;
}

export interface WalletBalance {
  address: string;
  tokens: TokenBalance[];
  totalUsd: number;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string | null; // null for native ETH
  balance: string;
  decimals: number;
  usdValue: number;
  iconUrl?: string;
}

// Transaction types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';
export type TransactionDirection = 'sent' | 'received';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  token: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  timestamp: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
}

// BLIK types
export type BlikCodeStatus = 'active' | 'matched' | 'expired' | 'used';
export type BlikCodeMode = 'send' | 'receive';

export interface BlikCode {
  code: string;
  mode: BlikCodeMode;
  status: BlikCodeStatus;
  creatorAddress: string;
  amount?: string;
  token?: string;
  expiresAt: string;
  createdAt: string;
}

export interface BlikMatch {
  code: string;
  senderAddress: string;
  receiverAddress: string;
  amount: string;
  token: string;
  matchedAt: string;
}

// WebSocket Events
export interface BlikRegisterPayload {
  code: string;
  recipientAddress: string;
}

export interface BlikRedeemPayload {
  code: string;
  senderAddress: string;
  amount: string;
  token: string;
}

export interface BlikMatchedEvent {
  code: string;
  senderAddress: string;
  receiverAddress: string;
  amount: string;
  token: string;
}

export interface BlikConfirmPayload {
  code: string;
  txHash: string;
}

// Network types
export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
