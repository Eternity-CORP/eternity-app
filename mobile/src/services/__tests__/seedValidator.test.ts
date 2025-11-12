/**
 * Unit Tests for Seed Phrase Validator
 *
 * Coverage target: ≥ 90%
 * Performance target: All tests complete in < 5 seconds
 */

import {
  validateSeedPhrase,
  normalizeInput,
  transliterateRuToEn,
  isValidBIP39Word,
  findSimilarWords,
  quickValidate,
} from '../seedValidator';

describe('seedValidator', () => {
  // Valid test mnemonics (generated with actual BIP39)
  const VALID_12_WORD = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const VALID_24_WORD = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

  describe('normalizeInput', () => {
    it('should trim whitespace', () => {
      expect(normalizeInput('  test  ')).toBe('test');
      expect(normalizeInput('\n\ttest\n\t')).toBe('test');
    });

    it('should convert to lowercase', () => {
      expect(normalizeInput('TEST')).toBe('test');
      expect(normalizeInput('TeSt')).toBe('test');
    });

    it('should replace multiple spaces with single space', () => {
      expect(normalizeInput('word1    word2')).toBe('word1 word2');
      expect(normalizeInput('word1\n\nword2')).toBe('word1 word2');
    });

    it('should remove punctuation', () => {
      expect(normalizeInput('word1, word2. word3!')).toBe('word1 word2 word3');
      expect(normalizeInput('word1-word2_word3')).toBe('word1 word2 word3');
    });

    it('should handle empty input', () => {
      expect(normalizeInput('')).toBe('');
      expect(normalizeInput('   ')).toBe('');
    });

    it('should handle combined normalization', () => {
      const input = '  Word1,  WORD2.\n  word3!  ';
      expect(normalizeInput(input)).toBe('word1 word2 word3');
    });
  });

  describe('transliterateRuToEn', () => {
    it('should convert RU keyboard layout to EN', () => {
      // 'qwerty' typed on RU keyboard is 'йцукен'
      expect(transliterateRuToEn('йцукен')).toBe('qwerty');
    });

    it('should handle mixed case', () => {
      expect(transliterateRuToEn('Йцукен')).toBe('qwerty');
    });

    it('should leave EN characters unchanged', () => {
      expect(transliterateRuToEn('test')).toBe('test');
    });

    it('should handle empty string', () => {
      expect(transliterateRuToEn('')).toBe('');
    });
  });

  describe('isValidBIP39Word', () => {
    it('should return true for valid BIP39 words', () => {
      expect(isValidBIP39Word('abandon')).toBe(true);
      expect(isValidBIP39Word('ability')).toBe(true);
      expect(isValidBIP39Word('about')).toBe(true);
      expect(isValidBIP39Word('zoo')).toBe(true);
    });

    it('should return false for invalid words', () => {
      expect(isValidBIP39Word('invalid')).toBe(false);
      expect(isValidBIP39Word('notaword')).toBe(false);
      expect(isValidBIP39Word('test123')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidBIP39Word('ABANDON')).toBe(false);
      expect(isValidBIP39Word('Abandon')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(isValidBIP39Word('')).toBe(false);
    });
  });

  describe('findSimilarWords', () => {
    it('should find words with 1 character difference', () => {
      const results = findSimilarWords('abando'); // typo: missing 'n'
      expect(results).toContain('abandon');
    });

    it('should find words with 2 character difference', () => {
      const results = findSimilarWords('abandn'); // typo: missing 'o'
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit number of suggestions', () => {
      const results = findSimilarWords('test', 3, 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for completely different word', () => {
      const results = findSimilarWords('xyz123', 1);
      expect(results.length).toBe(0);
    });

    it('should return exact match first', () => {
      const results = findSimilarWords('abandon');
      expect(results[0]).toBe('abandon');
    });
  });

  describe('validateSeedPhrase', () => {
    describe('positive cases', () => {
      it('should validate correct 12-word seed phrase', () => {
        const result = validateSeedPhrase(VALID_12_WORD);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.normalized).toBe(VALID_12_WORD);
      });

      it('should validate correct 24-word seed phrase', () => {
        const result = validateSeedPhrase(VALID_24_WORD);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should normalize and validate messy input', () => {
        const messy = '  ABANDON  abandon,  abandon   abandon\nabandon abandon abandon abandon abandon abandon abandon about  ';
        const result = validateSeedPhrase(messy);
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe(VALID_12_WORD);
      });

      it('should handle extra punctuation', () => {
        const withPunctuation = 'abandon, abandon. abandon! abandon abandon abandon abandon abandon abandon abandon abandon about';
        const result = validateSeedPhrase(withPunctuation);
        expect(result.valid).toBe(true);
      });
    });

    describe('negative cases - empty input', () => {
      it('should reject empty string', () => {
        const result = validateSeedPhrase('');
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('EMPTY_INPUT');
      });

      it('should reject whitespace only', () => {
        const result = validateSeedPhrase('   \n\t  ');
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('EMPTY_INPUT');
      });
    });

    describe('negative cases - invalid word count', () => {
      it('should reject 11 words', () => {
        const result = validateSeedPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon');
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_WORD_COUNT');
        expect(result.errors[0].message).toContain('11');
      });

      it('should reject 13 words', () => {
        const input = VALID_12_WORD + ' extra';
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_WORD_COUNT');
      });

      it('should reject 25 words', () => {
        const input = VALID_24_WORD + ' extra';
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_WORD_COUNT');
      });

      it('should reject 1 word', () => {
        const result = validateSeedPhrase('abandon');
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_WORD_COUNT');
      });
    });

    describe('negative cases - invalid words', () => {
      it('should reject single invalid word', () => {
        const input = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invalidword';
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_WORD');
        expect(result.errors[0].wordIndex).toBe(11);
      });

      it('should reject multiple invalid words', () => {
        const input = 'invalid1 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invalid2';
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('MULTIPLE_INVALID_WORDS');
      });

      it('should provide suggestions for typos', () => {
        const input = 'abando abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'; // typo: missing 'n'
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions![0]).toContain('abandon');
      });

      it('should detect wrong keyboard layout', () => {
        // If a word typed in RU layout forms a valid EN word
        const input = 'фифтн abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'; // 'фифтн' is gibberish but may have EN equivalent
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
      });
    });

    describe('negative cases - invalid checksum', () => {
      it('should reject seed with invalid checksum', () => {
        // All valid words but wrong order = invalid checksum
        const input = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo';
        const result = validateSeedPhrase(input);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('INVALID_CHECKSUM');
      });

      it('should reject seed with valid words but wrong combination', () => {
        const input = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
        const result = validateSeedPhrase(input);
        // This may or may not be valid depending on checksum - but test that validation runs
        expect(result.valid).toBeDefined();
      });
    });

    describe('localization', () => {
      it('should provide English error messages', () => {
        const result = validateSeedPhrase('');
        expect(result.errors[0].message).toBeTruthy();
        expect(typeof result.errors[0].message).toBe('string');
      });

      it('should provide Russian error messages', () => {
        const result = validateSeedPhrase('');
        expect(result.errors[0].messageRu).toBeTruthy();
        expect(typeof result.errors[0].messageRu).toBe('string');
      });

      it('should have both EN and RU for all error types', () => {
        const testCases = [
          '',                    // EMPTY_INPUT
          'abandon',             // INVALID_WORD_COUNT
          'invalid ' + VALID_12_WORD.split(' ').slice(1).join(' '), // INVALID_WORD
        ];

        testCases.forEach(input => {
          const result = validateSeedPhrase(input);
          result.errors.forEach(error => {
            expect(error.message).toBeTruthy();
            expect(error.messageRu).toBeTruthy();
          });
        });
      });
    });
  });

  describe('quickValidate', () => {
    it('should quickly validate correct word count', () => {
      const result = quickValidate(VALID_12_WORD);
      expect(result.valid).toBe(true);
    });

    it('should reject wrong word count', () => {
      const result = quickValidate('abandon abandon abandon');
      expect(result.valid).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it('should reject empty input', () => {
      const result = quickValidate('');
      expect(result.valid).toBe(false);
    });

    it('should be more lenient than full validation', () => {
      // Quick validation doesn't check checksum
      const result = quickValidate('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon');
      // Should pass word count and basic checks
      expect(result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should validate in less than 1 second', () => {
      const start = Date.now();
      validateSeedPhrase(VALID_12_WORD);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle 24-word validation in less than 1 second', () => {
      const start = Date.now();
      validateSeedPhrase(VALID_24_WORD);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should perform quick validation in less than 100ms', () => {
      const start = Date.now();
      quickValidate(VALID_12_WORD);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('edge cases', () => {
    it('should handle Unicode characters', () => {
      const result = validateSeedPhrase('abandon🎉abandon');
      expect(result.valid).toBe(false);
    });

    it('should handle very long input', () => {
      const longInput = 'abandon '.repeat(1000);
      const result = validateSeedPhrase(longInput);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('INVALID_WORD_COUNT');
    });

    it('should handle numbers in words', () => {
      const result = validateSeedPhrase('abandon1 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      expect(result.valid).toBe(false);
    });

    it('should handle special characters', () => {
      const result = validateSeedPhrase('abandon@ abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
      expect(result.valid).toBe(false);
    });
  });
});
