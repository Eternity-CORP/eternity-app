/**
 * Wallet Service
 * Handles wallet generation, storage, and retrieval
 */

import * as SecureStore from 'expo-secure-store';
import { generateMnemonic, generateWalletFromMnemonic, isValidMnemonic, isValidMnemonicLength } from '@e-y/crypto';
import type { HDNodeWallet } from 'ethers';

const WALLET_MNEMONIC_KEY = 'wallet_mnemonic';
const WALLET_ADDRESS_KEY = 'wallet_address';

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
  const wallet = generateWalletFromMnemonic(mnemonic, 0);
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
  const wallet = generateWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, mnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

  // Don't include wallet object in return (not serializable for Redux)
  return {
    mnemonic,
    address,
  };
}

/**
 * @deprecated Use generateWallet() + saveWallet() instead
 * Generate and save wallet (for backward compatibility)
 */
export async function createWallet(): Promise<WalletData> {
  const walletData = await generateWallet();
  return await saveWallet(walletData.mnemonic);
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

    const wallet = generateWalletFromMnemonic(mnemonic, 0);
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
  const wallet = generateWalletFromMnemonic(normalizedMnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, normalizedMnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

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
  return generateWalletFromMnemonic(mnemonic, accountIndex);
}

/**
 * Clear wallet data (for logout/reset)
 */
export async function clearWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_MNEMONIC_KEY);
  await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
}
