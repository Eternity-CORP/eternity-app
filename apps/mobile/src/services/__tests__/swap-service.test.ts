/**
 * Swap Service Unit Tests
 * Tests swap utility functions without LI.FI API calls
 */

import {
  formatTokenAmount,
  parseTokenAmount,
  isCrossChainSwap,
  getChainName,
  getNativeToken,
  NATIVE_TOKEN_ADDRESS,
} from '../swap-service';

// Mock networks constant
jest.mock('@/src/constants/networks', () => ({
  SUPPORTED_NETWORKS: {
    ethereum: {
      chainId: 1,
      name: 'Ethereum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      iconUrl: 'https://ethereum.org/icon.png',
    },
    polygon: {
      chainId: 137,
      name: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      iconUrl: 'https://polygon.technology/icon.png',
    },
    arbitrum: {
      chainId: 42161,
      name: 'Arbitrum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      iconUrl: 'https://arbitrum.io/icon.png',
    },
    base: {
      chainId: 8453,
      name: 'Base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      iconUrl: 'https://base.org/icon.png',
    },
    optimism: {
      chainId: 10,
      name: 'Optimism',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      iconUrl: 'https://optimism.io/icon.png',
    },
  },
}));

// Use real ethers for these tests
jest.unmock('ethers');

// Re-mock specific ethers functions for our tests
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      formatUnits: actual.ethers?.formatUnits || actual.formatUnits,
      parseUnits: actual.ethers?.parseUnits || actual.parseUnits,
    },
  };
});

describe('SwapService', () => {
  describe('formatTokenAmount', () => {
    it('should format wei to human readable with default decimals', () => {
      // 1 USDC (6 decimals)
      const result = formatTokenAmount('1000000', 6);
      expect(result).toBe('1');
    });

    it('should format ETH with 18 decimals', () => {
      // 1 ETH
      const result = formatTokenAmount('1000000000000000000', 18);
      expect(result).toBe('1');
    });

    it('should format fractional amounts', () => {
      // 0.5 USDC
      const result = formatTokenAmount('500000', 6);
      expect(result).toBe('0.5');
    });

    it('should return 0 for zero amount', () => {
      const result = formatTokenAmount('0', 18);
      expect(result).toBe('0');
    });

    it('should handle very small amounts', () => {
      // 0.0000001 (less than threshold)
      const result = formatTokenAmount('100', 18);
      expect(result).toBe('<0.000001');
    });

    it('should respect maxDecimals parameter', () => {
      // 1.123456789 ETH
      const result = formatTokenAmount('1123456789000000000', 18, 2);
      expect(parseFloat(result)).toBeCloseTo(1.12, 1);
    });

    it('should format large amounts correctly', () => {
      // 1,000,000 USDC
      const result = formatTokenAmount('1000000000000', 6);
      expect(result).toContain('1,000,000');
    });
  });

  describe('parseTokenAmount', () => {
    it('should parse human readable to wei for USDC (6 decimals)', () => {
      const result = parseTokenAmount('1', 6);
      expect(result).toBe('1000000');
    });

    it('should parse human readable to wei for ETH (18 decimals)', () => {
      const result = parseTokenAmount('1', 18);
      expect(result).toBe('1000000000000000000');
    });

    it('should parse fractional amounts', () => {
      const result = parseTokenAmount('0.5', 6);
      expect(result).toBe('500000');
    });

    it('should return 0 for invalid input', () => {
      const result = parseTokenAmount('invalid', 18);
      expect(result).toBe('0');
    });

    it('should return 0 for empty string', () => {
      const result = parseTokenAmount('', 18);
      expect(result).toBe('0');
    });

    it('should handle decimal amounts with many places', () => {
      // 1.123456789012345678 ETH - should truncate to 18 decimals
      const result = parseTokenAmount('1.123456789012345678', 18);
      expect(result).toBe('1123456789012345678');
    });
  });

  describe('isCrossChainSwap', () => {
    it('should return false for same chain swap', () => {
      expect(isCrossChainSwap(1, 1)).toBe(false);
      expect(isCrossChainSwap(137, 137)).toBe(false);
      expect(isCrossChainSwap(42161, 42161)).toBe(false);
    });

    it('should return true for different chains', () => {
      expect(isCrossChainSwap(1, 137)).toBe(true);
      expect(isCrossChainSwap(137, 42161)).toBe(true);
      expect(isCrossChainSwap(8453, 10)).toBe(true);
    });

    it('should return true for cross-chain in both directions', () => {
      expect(isCrossChainSwap(1, 137)).toBe(true);
      expect(isCrossChainSwap(137, 1)).toBe(true);
    });
  });

  describe('getChainName', () => {
    it('should return correct chain names for known chains', () => {
      expect(getChainName(1)).toBe('Ethereum');
      expect(getChainName(137)).toBe('Polygon');
      expect(getChainName(42161)).toBe('Arbitrum');
      expect(getChainName(8453)).toBe('Base');
      expect(getChainName(10)).toBe('Optimism');
    });

    it('should return fallback for unknown chains', () => {
      expect(getChainName(999999)).toBe('Chain 999999');
    });
  });

  describe('getNativeToken', () => {
    it('should return correct native token for Ethereum', () => {
      const token = getNativeToken('ethereum');
      expect(token.symbol).toBe('ETH');
      expect(token.decimals).toBe(18);
      expect(token.address).toBe(NATIVE_TOKEN_ADDRESS);
    });

    it('should return correct native token for Polygon', () => {
      const token = getNativeToken('polygon');
      expect(token.symbol).toBe('MATIC');
      expect(token.decimals).toBe(18);
      expect(token.address).toBe(NATIVE_TOKEN_ADDRESS);
    });

    it('should return ETH for L2s (Arbitrum, Base, Optimism)', () => {
      expect(getNativeToken('arbitrum').symbol).toBe('ETH');
      expect(getNativeToken('base').symbol).toBe('ETH');
      expect(getNativeToken('optimism').symbol).toBe('ETH');
    });
  });

  describe('NATIVE_TOKEN_ADDRESS', () => {
    it('should be the zero address', () => {
      expect(NATIVE_TOKEN_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
    });
  });
});
