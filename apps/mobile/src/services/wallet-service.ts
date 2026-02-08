/**
 * Wallet Service
 * Handles wallet generation, storage, and retrieval
 */

import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { generateMnemonic, deriveWalletFromMnemonic, isValidMnemonic, isValidMnemonicLength, getAddressFromMnemonic } from '@e-y/crypto';
import type { HDNodeWallet } from 'ethers';
import { type AccountType, type WalletAccount, createAccount, getNextAccountIndex } from '@e-y/shared';

type Account = WalletAccount;

const WALLET_MNEMONIC_KEY = 'wallet_mnemonic';
const WALLET_ADDRESS_KEY = 'wallet_address';
const ACCOUNTS_KEY = 'wallet_accounts'; // Legacy SecureStore key (for migration)
const ACCOUNTS_FILE = `${FileSystem.documentDirectory}accounts.json`;

export interface WalletData {
  mnemonic: string;
  address: string;
  wallet?: HDNodeWallet; // Optional: only included when needed, not serialized in Redux
}

/**
 * Generate a new wallet with mnemonic (does NOT save to storage)
 * Use saveWallet() after verification to persist
 * @param wordCount - Number of words: 12 or 24 (default: 12)
 * @param type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export async function generateWallet(wordCount: 12 | 24 = 12, type: AccountType = 'test'): Promise<WalletData & { type: AccountType }> {
  const mnemonic = generateMnemonic(wordCount);
  const wallet = deriveWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic,
    address,
    type,
  };
}

/**
 * Save wallet to secure storage (call after verification)
 * @param mnemonic - The mnemonic phrase to save
 * @param type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export async function saveWallet(mnemonic: string, type: AccountType = 'test'): Promise<WalletData & { type: AccountType }> {
  const wallet = deriveWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, mnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

  // Create default account if accounts don't exist
  const existingAccounts = await loadAccounts();
  if (existingAccounts.length === 0) {
    await saveAccounts([createAccount({ index: 0, address, type })]);
  }

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic,
    address,
    type,
  };
}


/**
 * Load existing wallet from secure storage
 */
export async function loadWallet(): Promise<WalletData | null> {
  try {
    const mnemonic = await SecureStore.getItemAsync(WALLET_MNEMONIC_KEY);
    if (!mnemonic) {
      return null;
    }

    const wallet = deriveWalletFromMnemonic(mnemonic, 0);
    const address = wallet.address;

    // Don't include wallet object in return (not serializable for Redux)
    return {
      mnemonic,
      address,
    };
  } catch (error) {
    console.error('Error loading wallet:', error);
    return null;
  }
}

/**
 * Load all accounts from storage
 * Uses file system (no size limit) instead of SecureStore
 * Includes migration from legacy SecureStore storage
 *
 * Migration: Accounts without 'type' field will default to 'test'
 */
export async function loadAccounts(): Promise<Account[]> {
  try {
    // First, try to load from file system
    const fileInfo = await FileSystem.getInfoAsync(ACCOUNTS_FILE);
    if (fileInfo.exists) {
      const accountsJson = await FileSystem.readAsStringAsync(ACCOUNTS_FILE);
      const accounts = JSON.parse(accountsJson) as Account[];
      // Migration: add type field to accounts that don't have it
      const migratedAccounts = migrateAccountsWithType(accounts);
      // Save back if migration occurred
      if (migratedAccounts.some((acc, i) => acc.type !== accounts[i]?.type)) {
        await FileSystem.writeAsStringAsync(ACCOUNTS_FILE, JSON.stringify(migratedAccounts));
      }
      return migratedAccounts;
    }

    // Migration: check if accounts exist in legacy SecureStore
    const legacyAccountsJson = await SecureStore.getItemAsync(ACCOUNTS_KEY);
    if (legacyAccountsJson) {
      const accounts = JSON.parse(legacyAccountsJson) as Account[];
      // Migration: add type field to accounts that don't have it
      const migratedAccounts = migrateAccountsWithType(accounts);
      // Migrate to file system with type field
      await FileSystem.writeAsStringAsync(ACCOUNTS_FILE, JSON.stringify(migratedAccounts));
      // Clean up legacy storage
      await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
      return migratedAccounts;
    }

    // No accounts stored
    return [];
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

/**
 * Migrate accounts that don't have a type field
 * Default to 'test' for backwards compatibility
 */
function migrateAccountsWithType(accounts: Partial<Account>[]): Account[] {
  return accounts.map((acc) => ({
    ...acc,
    type: acc.type || 'test',
  })) as Account[];
}

/**
 * Save accounts to storage
 * Uses file system to avoid SecureStore 2048 byte limit
 */
export async function saveAccounts(accounts: Account[]): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(ACCOUNTS_FILE, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving accounts:', error);
    throw error;
  }
}

/**
 * Create a new account from mnemonic at the next account index
 * @param mnemonic - The mnemonic phrase
 * @param existingAccounts - List of existing accounts
 * @param type - Account type: 'test' for testnets, 'real' for mainnets (default: 'test')
 */
export async function createNewAccount(mnemonic: string, existingAccounts: Account[], type: AccountType = 'test'): Promise<Account> {
  const newAccountIndex = getNextAccountIndex(existingAccounts);
  const address = getAddressFromMnemonic(mnemonic, newAccountIndex);

  const newAccount = createAccount({
    index: newAccountIndex,
    address,
    type,
  });

  // Save updated accounts list
  const updatedAccounts = [...existingAccounts, newAccount];
  await saveAccounts(updatedAccounts);

  return newAccount;
}

/**
 * Check if wallet exists
 */
export async function hasWallet(): Promise<boolean> {
  try {
    const mnemonic = await SecureStore.getItemAsync(WALLET_MNEMONIC_KEY);
    return mnemonic !== null;
  } catch {
    return false;
  }
}

/**
 * Import wallet from mnemonic phrase
 * Validates the mnemonic before saving
 * Imported wallets are always 'real' accounts (users import real wallets)
 */
export async function importWallet(mnemonic: string): Promise<WalletData & { type: AccountType }> {
  // Normalize mnemonic (trim, normalize whitespace)
  const normalizedMnemonic = mnemonic.trim().replace(/\s+/g, ' ');

  // Validate format
  if (!isValidMnemonicLength(normalizedMnemonic)) {
    throw new Error('Invalid seed phrase length. Must be 12 or 24 words.');
  }

  // Validate mnemonic
  if (!isValidMnemonic(normalizedMnemonic)) {
    throw new Error('Invalid seed phrase. Please check your words and try again.');
  }

  // Generate wallet from mnemonic
  const wallet = deriveWalletFromMnemonic(normalizedMnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, normalizedMnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

  // Create default account if accounts don't exist
  // Imported wallets are always 'real' accounts
  const existingAccounts = await loadAccounts();
  if (existingAccounts.length === 0) {
    await saveAccounts([createAccount({ index: 0, address, type: 'real' })]);
  }

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic: normalizedMnemonic,
    address,
    type: 'real',
  };
}

/**
 * Get wallet object from mnemonic (for signing transactions)
 * This creates a new wallet instance when needed, not stored in Redux
 */
export function getWalletFromMnemonic(mnemonic: string, accountIndex: number = 0): HDNodeWallet {
  return deriveWalletFromMnemonic(mnemonic, accountIndex);
}

/**
 * Clear wallet data (for logout/reset)
 */
export async function clearWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_MNEMONIC_KEY);
  await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
  // Delete accounts file
  const fileInfo = await FileSystem.getInfoAsync(ACCOUNTS_FILE);
  if (fileInfo.exists) {
    await FileSystem.deleteAsync(ACCOUNTS_FILE);
  }
  // Also clean up legacy SecureStore key if exists
  await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
}
