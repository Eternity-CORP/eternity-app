/**
 * Wallet Service
 * Handles wallet generation, storage, and retrieval
 */

import * as SecureStore from 'expo-secure-store';
import { generateMnemonic, generateWalletFromMnemonic } from '@e-y/crypto';
import type { HDNodeWallet } from 'ethers';

const WALLET_MNEMONIC_KEY = 'wallet_mnemonic';
const WALLET_ADDRESS_KEY = 'wallet_address';

export interface WalletData {
  mnemonic: string;
  address: string;
  wallet: HDNodeWallet;
}

/**
 * Generate a new wallet with mnemonic
 */
export async function createWallet(): Promise<WalletData> {
  const mnemonic = generateMnemonic();
  const wallet = generateWalletFromMnemonic(mnemonic, 0);
  const address = wallet.address;

  // Store mnemonic securely
  await SecureStore.setItemAsync(WALLET_MNEMONIC_KEY, mnemonic);
  await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);

  return {
    mnemonic,
    address,
    wallet,
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

    const wallet = generateWalletFromMnemonic(mnemonic, 0);
    const address = wallet.address;

    return {
      mnemonic,
      address,
      wallet,
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
 * Clear wallet data (for logout/reset)
 */
export async function clearWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_MNEMONIC_KEY);
  await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
}
