/**
 * Seed Phrase Validator
 *
 * Robust validation for BIP39 seed phrases with:
 * - Word count validation (12 or 24 words)
 * - BIP39 English wordlist checking
 * - Typo detection and suggestions (fuzzy matching)
 * - Keyboard layout handling (RU/EN transliteration)
 * - Whitespace and punctuation normalization
 * - Checksum validation
 * - Localized error messages
 * - Offline operation (no network calls)
 *
 * Performance target: ≤ 1 second on average devices
 */

import { ethers } from 'ethers';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  normalized?: string; // Cleaned and normalized mnemonic
  errors: ValidationError[];
  suggestions?: SuggestionMap; // Word index -> suggested corrections
}

export interface ValidationError {
  type: ErrorType;
  message: string;
  messageRu: string;
  wordIndex?: number; // For word-specific errors
  word?: string;
}

export type ErrorType =
  | 'EMPTY_INPUT'
  | 'INVALID_WORD_COUNT'
  | 'INVALID_WORD'
  | 'INVALID_CHECKSUM'
  | 'MULTIPLE_INVALID_WORDS'
  | 'TYPO_DETECTED'
  | 'WRONG_KEYBOARD_LAYOUT';

export interface SuggestionMap {
  [wordIndex: number]: string[]; // Array of suggested corrections
}

/**
 * Keyboard layout mapping (RU QWERTY -> EN QWERTY)
 */
const RU_TO_EN_LAYOUT: { [key: string]: string } = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
  'х': '[', 'ъ': ']', 'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k',
  'д': 'l', 'ж': ';', 'э': '\'', 'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
  'б': ',', 'ю': '.',
};

/**
 * Normalize input: trim, lowercase, remove extra whitespace and punctuation
 */
export function normalizeInput(input: string): string {
  if (!input) return '';

  return input
    .toLowerCase()
    .trim()
    // Remove common punctuation except spaces
    .replace(/[,.\-_:;!?(){}[\]"'`]/g, ' ')
    // Replace multiple spaces/tabs/newlines with single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert RU keyboard layout to EN
 */
export function transliterateRuToEn(text: string): string {
  return text
    .split('')
    .map(char => RU_TO_EN_LAYOUT[char.toLowerCase()] || char)
    .join('');
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Get BIP39 English wordlist (cached for performance)
 */
let cachedWordlist: string[] | null = null;

function getWordlist(): string[] {
  if (cachedWordlist) {
    return cachedWordlist;
  }

  // ethers v5 doesn't have getWords(), so we need to build the list manually
  // The wordlist has 2048 words indexed from 0 to 2047
  const words: string[] = [];
  const wordlist = ethers.wordlists.en;

  for (let i = 0; i < 2048; i++) {
    try {
      const word = wordlist.getWord(i);
      words.push(word);
    } catch {
      break;
    }
  }

  cachedWordlist = words;
  return words;
}

/**
 * Find similar words in BIP39 wordlist using fuzzy matching
 */
export function findSimilarWords(word: string, maxDistance: number = 2, maxSuggestions: number = 3): string[] {
  const wordlist = getWordlist();
  const candidates: Array<{ word: string; distance: number }> = [];

  for (const validWord of wordlist) {
    const distance = levenshteinDistance(word, validWord);
    if (distance <= maxDistance) {
      candidates.push({ word: validWord, distance });
    }
  }

  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distance - b.distance);

  return candidates.slice(0, maxSuggestions).map(c => c.word);
}

/**
 * Check if word is in BIP39 English wordlist
 */
export function isValidBIP39Word(word: string): boolean {
  try {
    const wordlist = ethers.wordlists.en;
    const index = wordlist.getWordIndex(word);
    return index !== -1;
  } catch {
    return false;
  }
}

/**
 * Validate seed phrase with comprehensive checks
 */
export function validateSeedPhrase(input: string): ValidationResult {
  const errors: ValidationError[] = [];
  let suggestions: SuggestionMap = {};

  // 1. Check for empty input
  if (!input || !input.trim()) {
    errors.push({
      type: 'EMPTY_INPUT',
      message: 'Please enter a seed phrase',
      messageRu: 'Пожалуйста, введите сид-фразу',
    });
    return { valid: false, errors };
  }

  // 2. Normalize input
  const normalized = normalizeInput(input);
  const words = normalized.split(/\s+/);

  // 3. Check word count
  if (words.length !== 12 && words.length !== 24) {
    errors.push({
      type: 'INVALID_WORD_COUNT',
      message: `Invalid word count: ${words.length}. Expected 12 or 24 words.`,
      messageRu: `Неверное количество слов: ${words.length}. Ожидается 12 или 24 слова.`,
    });
    return { valid: false, errors };
  }

  // 4. Validate each word
  const invalidWords: Array<{ index: number; word: string }> = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    if (!isValidBIP39Word(word)) {
      invalidWords.push({ index: i, word });

      // Try fuzzy matching
      const similar = findSimilarWords(word, 2, 3);
      if (similar.length > 0) {
        suggestions[i] = similar;
      }

      // Try transliteration (RU -> EN)
      const transliterated = transliterateRuToEn(word);
      if (transliterated !== word && isValidBIP39Word(transliterated)) {
        errors.push({
          type: 'WRONG_KEYBOARD_LAYOUT',
          message: `Word #${i + 1} "${word}" appears to be typed in wrong keyboard layout. Did you mean "${transliterated}"?`,
          messageRu: `Слово #${i + 1} "${word}" набрано в неправильной раскладке. Возможно, вы имели в виду "${transliterated}"?`,
          wordIndex: i,
          word,
        });
        suggestions[i] = [transliterated, ...(suggestions[i] || [])];
      }
    }
  }

  // 5. Report invalid words
  if (invalidWords.length > 0) {
    if (invalidWords.length === 1) {
      const { index, word } = invalidWords[0];
      errors.push({
        type: 'INVALID_WORD',
        message: `Word #${index + 1} "${word}" is not in the BIP39 English wordlist.`,
        messageRu: `Слово #${index + 1} "${word}" отсутствует в английском словаре BIP39.`,
        wordIndex: index,
        word,
      });
    } else {
      const wordList = invalidWords.map(w => `#${w.index + 1} "${w.word}"`).join(', ');
      errors.push({
        type: 'MULTIPLE_INVALID_WORDS',
        message: `${invalidWords.length} words are not in the BIP39 wordlist: ${wordList}`,
        messageRu: `${invalidWords.length} слов отсутствуют в словаре BIP39: ${wordList}`,
      });
    }

    return { valid: false, errors, suggestions };
  }

  // 6. Check mnemonic checksum
  const mnemonicString = words.join(' ');
  const isValid = ethers.utils.isValidMnemonic(mnemonicString);

  if (!isValid) {
    errors.push({
      type: 'INVALID_CHECKSUM',
      message: 'Invalid seed phrase: checksum verification failed. Please check the word order and spelling.',
      messageRu: 'Неверная сид-фраза: проверка контрольной суммы не прошла. Проверьте порядок слов и правописание.',
    });
    return { valid: false, errors };
  }

  // 7. Success!
  return {
    valid: true,
    normalized: mnemonicString,
    errors: [],
  };
}

/**
 * Quick validation for real-time feedback (less comprehensive)
 */
export function quickValidate(input: string): { valid: boolean; message?: string; messageRu?: string } {
  if (!input || !input.trim()) {
    return { valid: false };
  }

  const normalized = normalizeInput(input);
  const words = normalized.split(/\s+/);

  if (words.length !== 12 && words.length !== 24) {
    return {
      valid: false,
      message: `${words.length} words (need 12 or 24)`,
      messageRu: `${words.length} слов (нужно 12 или 24)`,
    };
  }

  // Check if at least some words are valid (for real-time feedback)
  const validWordCount = words.filter(w => isValidBIP39Word(w)).length;
  const percentage = Math.round((validWordCount / words.length) * 100);

  if (percentage < 50) {
    return {
      valid: false,
      message: `Only ${percentage}% of words are valid`,
      messageRu: `Только ${percentage}% слов правильные`,
    };
  }

  return { valid: true };
}
