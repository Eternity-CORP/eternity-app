/**
 * Wallet Service
 * Handles wallet generation, storage, and retrieval
 */

import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { generateMnemonic, deriveWalletFromMnemonic, isValidMnemonic, isValidMnemonicLength, getAddressFromMnemonic } from '@e-y/crypto';
import type { HDNodeWallet } from 'ethers';
import type { Account } from '@/src/store/slices/wallet-slice';

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
 */
export async function generateWallet(wordCount: 12 | 24 = 12): Promise<WalletData> {
  const mnemonic = generateMnemonic(wordCount);
  const wallet = deriveWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic,
    address,
  };
}

/**
 * Save wallet to secure storage (call after verification)
 */
export async function saveWallet(mnemonic: string): Promise<WalletData> {
  const wallet = deriveWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, mnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

  // Create default account if accounts don't exist
  const existingAccounts = await loadAccounts();
  if (existingAccounts.length === 0) {
    const defaultAccount: Account = {
      id: '0',
      address,
      accountIndex: 0,
    };
    await saveAccounts([defaultAccount]);
  }

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic,
    address,
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
 */
export async function loadAccounts(): Promise<Account[]> {
  try {
    // First, try to load from file system
    const fileInfo = await FileSystem.getInfoAsync(ACCOUNTS_FILE);
    if (fileInfo.exists) {
      const accountsJson = await FileSystem.readAsStringAsync(ACCOUNTS_FILE);
      return JSON.parse(accountsJson) as Account[];
    }

    // Migration: check if accounts exist in legacy SecureStore
    const legacyAccountsJson = await SecureStore.getItemAsync(ACCOUNTS_KEY);
    if (legacyAccountsJson) {
      const accounts = JSON.parse(legacyAccountsJson) as Account[];
      // Migrate to file system
      await FileSystem.writeAsStringAsync(ACCOUNTS_FILE, legacyAccountsJson);
      // Clean up legacy storage
      await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
      return accounts;
    }

    // No accounts stored
    return [];
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
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
 */
export async function createNewAccount(mnemonic: string, existingAccounts: Account[]): Promise<Account> {
  // Find the highest accountIndex
  const maxIndex = existingAccounts.length > 0
    ? Math.max(...existingAccounts.map((acc) => acc.accountIndex))
    : -1;
  
  const newAccountIndex = maxIndex + 1;
  const address = getAddressFromMnemonic(mnemonic, newAccountIndex);

  const newAccount: Account = {
    id: newAccountIndex.toString(),
    address,
    accountIndex: newAccountIndex,
  };

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
 */
export async function importWallet(mnemonic: string): Promise<WalletData> {
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
  const existingAccounts = await loadAccounts();
  if (existingAccounts.length === 0) {
    const defaultAccount: Account = {
      id: '0',
      address,
      accountIndex: 0,
    };
    await saveAccounts([defaultAccount]);
  }

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic: normalizedMnemonic,
    address,
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
