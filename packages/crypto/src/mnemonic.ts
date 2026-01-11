import { Mnemonic, wordlists } from 'ethers';

// Get word list as array
const englishWordList = wordlists.en;

/**
 * Validate mnemonic phrase format and checksum
 */
export const isValidMnemonic = (phrase: string): boolean => {
  try {
    const words = phrase.trim().toLowerCase().split(/\s+/);

    // Must be 12 or 24 words
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }

    // Check if ethers can parse it
    Mnemonic.fromPhrase(phrase);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get the word list (BIP-39 English)
 */
export const getWordList = (): string[] => {
  const words: string[] = [];
  for (let i = 0; i < 2048; i++) {
    words.push(englishWordList.getWord(i));
  }
  return words;
};

/**
 * Check if a single word is valid
 */
export const isValidWord = (word: string): boolean => {
  try {
    englishWordList.getWordIndex(word.toLowerCase());
    return true;
  } catch {
    return false;
  }
};

/**
 * Get word suggestions for autocomplete
 */
export const getWordSuggestions = (prefix: string, limit = 5): string[] => {
  const normalizedPrefix = prefix.toLowerCase().trim();
  if (!normalizedPrefix) return [];

  const words = getWordList();
  return words
    .filter((word) => word.startsWith(normalizedPrefix))
    .slice(0, limit);
};

/**
 * Normalize mnemonic phrase (lowercase, single spaces)
 */
export const normalizeMnemonic = (phrase: string): string => {
  return phrase.trim().toLowerCase().split(/\s+/).join(' ');
};

/**
 * Generate new mnemonic phrase
 */
export const generateMnemonic = (wordCount: 12 | 24 = 12): string => {
  // ethers generates 12 words by default
  const strength = wordCount === 24 ? 256 : 128;
  const mnemonic = Mnemonic.fromEntropy(
    crypto.getRandomValues(new Uint8Array(strength / 8))
  );
  return mnemonic.phrase;
};

/**
 * Get random indices for seed phrase verification
 */
export const getVerificationIndices = (
  totalWords: number,
  count = 3
): number[] => {
  const indices: number[] = [];
  while (indices.length < count) {
    const index = Math.floor(Math.random() * totalWords);
    if (!indices.includes(index)) {
      indices.push(index);
    }
  }
  return indices.sort((a, b) => a - b);
};
