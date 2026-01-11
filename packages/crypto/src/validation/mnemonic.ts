/**
 * Mnemonic validation utilities
 */

import { Mnemonic } from 'ethers';

/**
 * Validate mnemonic phrase (12 or 24 words)
 */
export function isValidMnemonic(phrase: string): boolean {
  try {
    Mnemonic.fromPhrase(phrase);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get word count from mnemonic phrase
 */
export function getMnemonicWordCount(phrase: string): number {
  return phrase.trim().split(/\s+/).length;
}

/**
 * Validate mnemonic word count (must be 12 or 24)
 */
export function isValidMnemonicLength(phrase: string): boolean {
  const wordCount = getMnemonicWordCount(phrase);
  return wordCount === 12 || wordCount === 24;
}
