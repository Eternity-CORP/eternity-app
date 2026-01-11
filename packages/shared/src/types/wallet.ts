/**
 * Wallet-related types
 */

export interface Wallet {
  address: string;
  publicKey: string;
  accountIndex?: number;
  createdAt: string;
}

export interface WalletAccount {
  address: string;
  accountIndex: number;
  label?: string;
  createdAt: string;
}

export interface WalletBalance {
  address: string;
  token: string;
  balance: string;
  usdValue?: number;
  lastUpdated: string;
}
