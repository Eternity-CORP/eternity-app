/**
 * Wallet-related types
 */

/**
 * Account type for TEST/REAL account separation
 * - 'test': Account for testnet networks only
 * - 'real': Account for mainnet networks only
 */
export type AccountType = 'test' | 'real' | 'business';

export interface Wallet {
  address: string;
  publicKey: string;
  accountIndex?: number;
  createdAt: string;
}

export interface WalletAccount {
  id: string;
  address: string;
  accountIndex: number;
  label?: string;
  type: AccountType; // Account type: 'test' for testnets, 'real' for mainnets
  createdAt?: number;
}

export interface WalletBalance {
  address: string;
  token: string;
  balance: string;
  usdValue?: number;
  lastUpdated: string;
}
