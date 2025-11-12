/**
 * Unit Tests: Error Mapper
 * 
 * Tests for error detection and mapping:
 * - Error code detection
 * - Error mapping
 * - Localization
 * - Action suggestions
 */

import { describe, it, expect } from 'vitest';
import {
  detectErrorCode,
  mapError,
  isRetryableError,
  isUserFault,
  getPrimaryAction,
  getActionLabel,
} from '../errorMapper';

describe('Error Mapper', () => {
  describe('Error Detection', () => {
    it('should detect insufficient funds', () => {
      const error = new Error('insufficient funds for gas * price + value');
      const code = detectErrorCode(error);
      expect(code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should detect nonce too low', () => {
      const error = new Error('nonce too low');
      const code = detectErrorCode(error);
      expect(code).toBe('NONCE_TOO_LOW');
    });

    it('should detect replacement underpriced', () => {
      const error = new Error('replacement transaction underpriced');
      const code = detectErrorCode(error);
      expect(code).toBe('REPLACEMENT_UNDERPRICED');
    });

    it('should detect execution reverted', () => {
      const error = new Error('execution reverted');
      const code = detectErrorCode(error);
      expect(code).toBe('EXECUTION_REVERTED');
    });

    it('should detect network mismatch', () => {
      const error = new Error('chain mismatch');
      const code = detectErrorCode(error);
      expect(code).toBe('NETWORK_MISMATCH');
    });

    it('should detect timeout', () => {
      const error = new Error('request timeout');
      const code = detectErrorCode(error);
      expect(code).toBe('TIMEOUT');
    });

    it('should detect user rejected', () => {
      const error = new Error('user rejected transaction');
      const code = detectErrorCode(error);
      expect(code).toBe('USER_REJECTED');
    });

    it('should detect gas price too low', () => {
      const error = new Error('max fee per gas less than block base fee');
      const code = detectErrorCode(error);
      expect(code).toBe('GAS_PRICE_TOO_LOW');
    });

    it('should detect network error', () => {
      const error = new Error('network request failed');
      const code = detectErrorCode(error);
      expect(code).toBe('NETWORK_ERROR');
    });

    it('should detect unknown error', () => {
      const error = new Error('something weird happened');
      const code = detectErrorCode(error);
      expect(code).toBe('UNKNOWN_ERROR');
    });

    it('should handle error objects with reason', () => {
      const error = { reason: 'insufficient funds' };
      const code = detectErrorCode(error);
      expect(code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should handle nested error objects', () => {
      const error = { error: { message: 'nonce too low' } };
      const code = detectErrorCode(error);
      expect(code).toBe('NONCE_TOO_LOW');
    });
  });

  describe('Error Mapping', () => {
    it('should map insufficient funds error', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error);

      expect(mapped.code).toBe('INSUFFICIENT_FUNDS');
      expect(mapped.severity).toBe('error');
      expect(mapped.title).toContain('Insufficient');
      expect(mapped.actions).toContain('top_up');
      expect(mapped.retryable).toBe(true);
      expect(mapped.userFault).toBe(true);
    });

    it('should map nonce too low error', () => {
      const error = new Error('nonce too low');
      const mapped = mapError(error);

      expect(mapped.code).toBe('NONCE_TOO_LOW');
      expect(mapped.severity).toBe('warning');
      expect(mapped.actions).toContain('retry');
      expect(mapped.retryable).toBe(true);
      expect(mapped.userFault).toBe(false);
    });

    it('should map execution reverted error', () => {
      const error = new Error('execution reverted');
      const mapped = mapError(error);

      expect(mapped.code).toBe('EXECUTION_REVERTED');
      expect(mapped.severity).toBe('error');
      expect(mapped.retryable).toBe(false);
      expect(mapped.actions).toContain('contact_support');
    });

    it('should map user rejected error', () => {
      const error = new Error('user rejected transaction');
      const mapped = mapError(error);

      expect(mapped.code).toBe('USER_REJECTED');
      expect(mapped.severity).toBe('info');
      expect(mapped.userFault).toBe(true);
    });

    it('should include technical details', () => {
      const error = new Error('some technical error message');
      const mapped = mapError(error);

      expect(mapped.technicalDetails).toBe('some technical error message');
    });
  });

  describe('Localization', () => {
    it('should provide English messages by default', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error, { operation: 'send' }, 'en');

      expect(mapped.title).toBe('Insufficient Funds');
      expect(mapped.message).toContain('balance');
    });

    it('should provide Russian messages', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error, { operation: 'send' }, 'ru');

      expect(mapped.title).toBe('Недостаточно средств');
      expect(mapped.message).toContain('баланс');
    });

    it('should fallback to English for unknown locale', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error, { operation: 'send' }, 'fr');

      expect(mapped.title).toBe('Insufficient Funds');
    });
  });

  describe('Action Suggestions', () => {
    it('should suggest top_up for insufficient funds', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error);

      expect(mapped.actions).toContain('top_up');
      expect(mapped.actions).toContain('reduce_amount');
    });

    it('should suggest speed_up for replacement underpriced', () => {
      const error = new Error('replacement transaction underpriced');
      const mapped = mapError(error);

      expect(mapped.actions).toContain('speed_up');
    });

    it('should suggest switch_network for network mismatch', () => {
      const error = new Error('chain mismatch');
      const mapped = mapError(error);

      expect(mapped.actions).toContain('switch_network');
    });

    it('should suggest retry for timeout', () => {
      const error = new Error('timeout');
      const mapped = mapError(error);

      expect(mapped.actions).toContain('retry');
    });

    it('should get primary action', () => {
      const error = new Error('insufficient funds');
      const action = getPrimaryAction(error);

      expect(action).toBe('top_up');
    });
  });

  describe('Action Labels', () => {
    it('should provide English action labels', () => {
      expect(getActionLabel('top_up', 'en')).toBe('Add Funds');
      expect(getActionLabel('retry', 'en')).toBe('Retry');
      expect(getActionLabel('speed_up', 'en')).toBe('Speed Up');
    });

    it('should provide Russian action labels', () => {
      expect(getActionLabel('top_up', 'ru')).toBe('Пополнить');
      expect(getActionLabel('retry', 'ru')).toBe('Повторить');
      expect(getActionLabel('speed_up', 'ru')).toBe('Ускорить');
    });
  });

  describe('Utility Functions', () => {
    it('should check if error is retryable', () => {
      const retryableError = new Error('timeout');
      const nonRetryableError = new Error('execution reverted');

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should check if error is user fault', () => {
      const userFaultError = new Error('insufficient funds');
      const notUserFaultError = new Error('nonce too low');

      expect(isUserFault(userFaultError)).toBe(true);
      expect(isUserFault(notUserFaultError)).toBe(false);
    });
  });

  describe('Context Formatting', () => {
    it('should format message with context', () => {
      const error = new Error('chain mismatch');
      const mapped = mapError(error, {
        operation: 'send',
        network: 'Sepolia',
      });

      expect(mapped.message).toContain('Sepolia');
    });

    it('should handle missing context gracefully', () => {
      const error = new Error('insufficient funds');
      const mapped = mapError(error, { operation: 'send' });

      expect(mapped.message).toBeDefined();
    });
  });
});
