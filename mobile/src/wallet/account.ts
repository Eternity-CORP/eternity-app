/**
 * Wallet Account Functions
 *
 * Provides account-level operations including:
 * - Address retrieval with EIP-55 checksum
 * - Message signing (EIP-191)
 * - Transaction signing
 * - DEV-only private key/mnemonic access
 *
 * Uses ethers v5.7.2 API
 */

import { ethers } from 'ethers';
import type { TransactionRequest } from '@ethersproject/abstract-provider';
import { getSigner, getAddress as getAddressFromService } from '../services/walletService';
import { getSeed } from '../services/cryptoService';
import type { Network } from '../config/env';

/**
 * Get current account address with EIP-55 checksum
 * Ensures the address is always properly checksummed
 */
export async function getAddress(): Promise<string | null> {
  const address = await getAddressFromService();
  if (!address) return null;

  // Apply EIP-55 checksum
  return ethers.utils.getAddress(address);
}

/**
 * Sign a message with the active account
 * Uses EIP-191 standard for message signing
 *
 * @param message - The message to sign (string or bytes)
 * @param network - Optional network (not used for message signing, kept for API consistency)
 * @returns Signature as a hex string
 *
 * @example
 * const signature = await signMessage("Hello, Ethereum!");
 * // Returns: "0x..."
 */
export async function signMessage(
  message: string | ethers.utils.Bytes,
  network?: Network
): Promise<string> {
  // For message signing, we don't need a provider connection
  const seed = await getSeed();
  if (!seed || !ethers.utils.isValidMnemonic(seed)) {
    throw new Error('No valid seed found');
  }

  const { getActiveAccountIndex } = require('../services/cryptoService');
  const index = await getActiveAccountIndex();
  const wallet = ethers.Wallet.fromMnemonic(seed, `m/44'/60'/0'/0/${index}`);

  return await wallet.signMessage(message);
}

/**
 * Sign a transaction with the active account
 * Does NOT broadcast the transaction
 *
 * @param transaction - Transaction request object
 * @param network - Optional network (not used for transaction signing, kept for API consistency)
 * @returns Signed transaction as a hex string
 *
 * @example
 * const signedTx = await signTransaction({
 *   to: "0x...",
 *   value: ethers.utils.parseEther("1.0"),
 *   gasLimit: 21000,
 *   chainId: 11155111
 * });
 */
export async function signTransaction(
  transaction: TransactionRequest,
  network?: Network
): Promise<string> {
  // For transaction signing, we don't need a provider connection
  const seed = await getSeed();
  if (!seed || !ethers.utils.isValidMnemonic(seed)) {
    throw new Error('No valid seed found');
  }

  const { getActiveAccountIndex } = require('../services/cryptoService');
  const index = await getActiveAccountIndex();
  const wallet = ethers.Wallet.fromMnemonic(seed, `m/44'/60'/0'/0/${index}`);

  return await wallet.signTransaction(transaction);
}

/**
 * Verify a message signature
 * Recovers the signer address from signature and verifies it matches expected address
 *
 * @param message - Original message that was signed
 * @param signature - Signature to verify
 * @param expectedAddress - Expected signer address (optional, defaults to current account)
 * @returns True if signature is valid
 *
 * @example
 * const isValid = await verifySignature("Hello", signature, "0x...");
 */
export async function verifySignature(
  message: string | ethers.utils.Bytes,
  signature: string,
  expectedAddress?: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    // If no expected address provided, use current account
    const addressToVerify = expectedAddress || (await getAddress());
    if (!addressToVerify) return false;

    // Compare checksummed addresses
    const recovered = ethers.utils.getAddress(recoveredAddress);
    const expected = ethers.utils.getAddress(addressToVerify);

    return recovered === expected;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// ============================================================================
// DEV-ONLY FUNCTIONS
// These functions expose sensitive data and should ONLY be available in DEV builds
// ============================================================================

/**
 * Get the private key for the active account
 * WARNING: This exposes sensitive data. DEV BUILDS ONLY!
 *
 * @throws Error in production builds
 * @returns Private key as hex string
 */
export async function getPrivateKey(): Promise<string | null> {
  if (!__DEV__) {
    throw new Error('getPrivateKey() is only available in development builds');
  }

  try {
    const seed = await getSeed();
    if (!seed || !ethers.utils.isValidMnemonic(seed)) {
      console.warn('[DEV] No valid seed found');
      return null;
    }

    // Get active account index
    const { getActiveAccountIndex } = require('../services/cryptoService');
    const index = await getActiveAccountIndex();

    // Derive wallet from seed
    const wallet = ethers.Wallet.fromMnemonic(seed, `m/44'/60'/0'/0/${index}`);

    console.log('[DEV] Private key accessed for account index:', index);
    return wallet.privateKey;
  } catch (error) {
    console.error('[DEV] Failed to get private key:', error);
    return null;
  }
}

/**
 * Get the mnemonic seed phrase
 * WARNING: This exposes the master secret. DEV BUILDS ONLY!
 *
 * @throws Error in production builds
 * @returns Mnemonic as string
 */
export async function getMnemonic(): Promise<string | null> {
  if (!__DEV__) {
    throw new Error('getMnemonic() is only available in development builds');
  }

  try {
    const seed = await getSeed();
    if (!seed || !ethers.utils.isValidMnemonic(seed)) {
      console.warn('[DEV] No valid seed found');
      return null;
    }

    console.log('[DEV] Mnemonic accessed');
    return seed;
  } catch (error) {
    console.error('[DEV] Failed to get mnemonic:', error);
    return null;
  }
}

/**
 * Get wallet instance for direct ethers operations
 * WARNING: Exposes wallet with private key. DEV BUILDS ONLY!
 *
 * @throws Error in production builds
 * @returns Ethers Wallet instance
 */
export async function getWalletInstance(network?: Network): Promise<ethers.Wallet | null> {
  if (!__DEV__) {
    throw new Error('getWalletInstance() is only available in development builds');
  }

  try {
    const signer = await getSigner(network);
    console.log('[DEV] Wallet instance accessed');
    return signer;
  } catch (error) {
    console.error('[DEV] Failed to get wallet instance:', error);
    return null;
  }
}

// Export type for external use
export type { TransactionRequest };
