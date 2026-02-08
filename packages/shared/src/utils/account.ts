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
 * Address derivation function signature.
 * Accepts mnemonic and account index, returns the correct address.
 * Use dependency injection to avoid importing @e-y/crypto in shared.
 */
export type DeriveAddressFn = (mnemonic: string, accountIndex: number) => string;

/**
 * Re-derive account addresses from mnemonic to fix stale/mismatched addresses.
 * Returns migrated accounts and whether any changes were made.
 *
 * @param accounts - Existing accounts from storage
 * @param mnemonic - The wallet mnemonic phrase
 * @param deriveAddress - Function to derive address from mnemonic + index
 * @returns { accounts: WalletAccount[], needsSave: boolean }
 */
export function migrateAccountAddresses(
  accounts: WalletAccount[],
  mnemonic: string,
  deriveAddress: DeriveAddressFn,
): { accounts: WalletAccount[]; needsSave: boolean } {
  let needsSave = false;
  const migrated = accounts.map((acc) => {
    const correctAddress = deriveAddress(mnemonic, acc.accountIndex);
    if (acc.address !== correctAddress) {
      needsSave = true;
      return { ...acc, address: correctAddress };
    }
    return acc;
  });
  return { accounts: migrated, needsSave };
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
