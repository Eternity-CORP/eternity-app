/**
 * Wallet generation using BIP-39
 */

import { Mnemonic } from 'ethers';
import { deriveWalletFromMnemonic } from './derive';

const DEFAULT_ACCOUNT_INDEX = 0;

/**
 * Generate random entropy bytes
 * Works in both Node.js/browser (crypto.getRandomValues) and React Native (with polyfill)
 * 
 * Note: In React Native apps, import 'react-native-get-random-values' at the top of your entry file
 * to polyfill crypto.getRandomValues globally.
 */
function getRandomBytes(length: number): Uint8Array {
  const entropy = new Uint8Array(length);
  
  // Helper to safely get crypto
  const getCrypto = (): { getRandomValues?: (array: Uint8Array) => void } | null => {
    // Try global.crypto first (React Native polyfill via react-native-get-random-values)
    if (typeof global !== 'undefined') {
      const globalCrypto = (global as any).crypto;
      if (globalCrypto && typeof globalCrypto.getRandomValues === 'function') {
        return globalCrypto;
      }
    }
    
    // Try crypto (Node.js/browser)
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
      return crypto as any;
    }
    
    return null;
  };
  
  const cryptoObj = getCrypto();
  if (cryptoObj && cryptoObj.getRandomValues) {
    try {
      cryptoObj.getRandomValues(entropy);
      // Verify that entropy was actually filled (not all zeros)
      const hasNonZero = entropy.some(byte => byte !== 0);
      if (hasNonZero) {
        return entropy;
      }
      // If all zeros, something went wrong — abort
      throw new Error('crypto.getRandomValues returned all zeros — cannot generate secure wallet');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cannot generate secure wallet')) {
        throw error;
      }
      throw new Error('crypto.getRandomValues failed — cannot generate secure wallet');
    }
  }

  throw new Error('crypto.getRandomValues is not available — cannot generate secure wallet');
}

/**
 * Generate a new mnemonic phrase
 * @param wordCount - Number of words: 12 or 24 (default: 12)
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  // Generate random entropy (16 bytes for 12 words, 32 bytes for 24 words)
  const entropyLength = wordCount === 12 ? 16 : 32;
  const entropy = getRandomBytes(entropyLength);
  
  const mnemonic = Mnemonic.entropyToPhrase(entropy);
  return mnemonic;
}

/**
 * Generate a new random wallet
 * @param wordCount - Number of words: 12 or 24 (default: 12)
 */
export function generateRandomWallet(
  accountIndex: number = DEFAULT_ACCOUNT_INDEX,
  wordCount: 12 | 24 = 12,
) {
  const mnemonic = generateMnemonic(wordCount);
  const wallet = deriveWalletFromMnemonic(mnemonic, accountIndex);
  return { wallet, mnemonic };
}
