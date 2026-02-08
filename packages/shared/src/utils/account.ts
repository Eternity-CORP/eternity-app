import type { AccountType, WalletAccount } from '../types/wallet';

/**
 * Generate a default label for an account
 */
export function generateAccountLabel(type: AccountType, index: number): string {
  if (index === 0) {
    return type === 'test' ? 'Test Wallet' : 'Main Wallet';
  }
  return type === 'test' ? `Test Wallet ${index}` : `Wallet ${index}`;
}

/**
 * Get the next available account index from existing accounts
 */
export function getNextAccountIndex(accounts: WalletAccount[]): number {
  if (accounts.length === 0) return 0;
  return accounts.reduce((max, a) => Math.max(max, a.accountIndex), -1) + 1;
}

/**
 * Create a new WalletAccount object
 */
export function createAccount(params: {
  index: number;
  address: string;
  type: AccountType;
  label?: string;
}): WalletAccount {
  return {
    id: String(params.index),
    address: params.address,
    accountIndex: params.index,
    label: params.label || generateAccountLabel(params.type, params.index),
    type: params.type,
  };
}
