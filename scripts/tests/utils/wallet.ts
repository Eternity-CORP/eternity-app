/**
 * Test Wallet Utilities
 */

import { Wallet, HDNodeWallet } from 'ethers';

export interface TestWallet {
  wallet: HDNodeWallet;
  address: string;
  mnemonic: string;
}

/**
 * Create a random test wallet
 */
export function createTestWallet(): TestWallet {
  const wallet = Wallet.createRandom();
  return {
    wallet,
    address: wallet.address.toLowerCase(),
    mnemonic: wallet.mnemonic!.phrase,
  };
}

/**
 * Sign a preferences message
 */
export async function signPreferencesMessage(
  wallet: HDNodeWallet,
  timestamp: number,
): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:preferences:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

/**
 * Sign a username claim message
 */
export async function signUsernameMessage(
  wallet: HDNodeWallet,
  username: string,
  action: 'claim' | 'update' | 'delete',
  timestamp: number,
): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:${action}:@${username}:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

/**
 * Sign a scheduled payment message
 */
export async function signScheduledMessage(
  wallet: HDNodeWallet,
  action: string,
  timestamp: number,
): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:scheduled:${action}:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

/**
 * Sign a split bill message
 */
export async function signSplitMessage(
  wallet: HDNodeWallet,
  action: string,
  timestamp: number,
): Promise<string> {
  const address = wallet.address.toLowerCase();
  const message = `E-Y:split:${action}:${address}:${timestamp}`;
  return wallet.signMessage(message);
}

/**
 * Generate a random username
 */
export function generateRandomUsername(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'test';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
