// Shared types for Eternity Wallet

// TODO: Add comprehensive type definitions for:
// - Wallet data structures
// - Transaction types
// - API request/response types
// - Blockchain network types
// - Token metadata types
// - User preferences types

export interface Wallet {
  address: string;
  name?: string;
  balance?: string;
  network: Network;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: TransactionStatus;
  network: Network;
  gasPrice?: string;
  gasUsed?: string;
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum Network {
  ETHEREUM_MAINNET = 'ethereum-mainnet',
  ETHEREUM_SEPOLIA = 'ethereum-sepolia',
  POLYGON_MAINNET = 'polygon-mainnet',
  BITCOIN_MAINNET = 'bitcoin-mainnet',
  BITCOIN_TESTNET = 'bitcoin-testnet',
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  logoUri?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WalletBalance {
  address: string;
  balance: string;
  tokens: Token[];
}

export * from './types/transaction.types';