/**
 * Wallet generation using BIP-39
 */

import { Mnemonic, HDNodeWallet } from 'ethers';

// Constants (will be imported from @e-y/shared once monorepo is configured)
const HD_WALLET_DERIVATION_PATH = "m/44'/60'/0'/0";
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
      // If all zeros, something went wrong, use fallback
      console.warn('crypto.getRandomValues returned all zeros, using fallback');
    } catch (error) {
      console.warn('crypto.getRandomValues failed, using fallback:', error);
    }
  }
  
  // Fallback: use Math.random (less secure, but works)
  // This is a safety fallback for development/testing
  console.warn('crypto.getRandomValues not available, using Math.random fallback (less secure)');
  for (let i = 0; i < entropy.length; i++) {
    entropy[i] = Math.floor(Math.random() * 256);
  }
  return entropy;
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
 * Generate a new wallet from mnemonic phrase
 */
export function generateWalletFromMnemonic(
  mnemonic: string,
  accountIndex: number = DEFAULT_ACCOUNT_INDEX,
): HDNodeWallet {
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
  const derivationPath = `${HD_WALLET_DERIVATION_PATH}/${accountIndex}`;
  return HDNodeWallet.fromPhrase(mnemonicObj.phrase, derivationPath);
}

/**
 * Generate a new random wallet
 * @param wordCount - Number of words: 12 or 24 (default: 12)
 */
export function generateRandomWallet(
  accountIndex: number = DEFAULT_ACCOUNT_INDEX,
  wordCount: 12 | 24 = 12,
): {
  wallet: HDNodeWallet;
  mnemonic: string;
} {
  const mnemonic = generateMnemonic(wordCount);
  const wallet = generateWalletFromMnemonic(mnemonic, accountIndex);
  return { wallet, mnemonic };
}
