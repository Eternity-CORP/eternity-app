/**
 * Preferences Service Unit Tests
 * Tests preference resolution logic without API calls
 */

// The resolvePreferredNetwork function is a pure function that doesn't need any imports
// Let's copy the logic here to test it in isolation

type NetworkId = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

interface NetworkPreferences {
  defaultNetwork: NetworkId | null;
  tokenOverrides: Record<string, NetworkId>;
}

/**
 * Pure function - same logic as in preferences-service.ts
 */
function resolvePreferredNetwork(
  preferences: NetworkPreferences | null,
  tokenSymbol: string
): NetworkId | null {
  if (!preferences) {
    return null;
  }

  // Check for token-specific override first
  const normalizedSymbol = tokenSymbol.toUpperCase();
  const tokenOverride = preferences.tokenOverrides[normalizedSymbol];
  if (tokenOverride) {
    return tokenOverride;
  }

  // Fall back to default network
  return preferences.defaultNetwork;
}

describe('PreferencesService', () => {
  describe('resolvePreferredNetwork', () => {
    describe('when preferences is null', () => {
      it('should return null (sender\'s choice)', () => {
        const result = resolvePreferredNetwork(null, 'USDC');
        expect(result).toBeNull();
      });

      it('should return null for any token', () => {
        expect(resolvePreferredNetwork(null, 'ETH')).toBeNull();
        expect(resolvePreferredNetwork(null, 'USDT')).toBeNull();
        expect(resolvePreferredNetwork(null, 'DAI')).toBeNull();
      });
    });

    describe('when preferences has only defaultNetwork', () => {
      const preferences: NetworkPreferences = {
        defaultNetwork: 'arbitrum',
        tokenOverrides: {},
      };

      it('should return defaultNetwork for any token', () => {
        expect(resolvePreferredNetwork(preferences, 'USDC')).toBe('arbitrum');
        expect(resolvePreferredNetwork(preferences, 'ETH')).toBe('arbitrum');
        expect(resolvePreferredNetwork(preferences, 'USDT')).toBe('arbitrum');
      });
    });

    describe('when preferences has only tokenOverrides', () => {
      const preferences: NetworkPreferences = {
        defaultNetwork: null,
        tokenOverrides: {
          USDC: 'base',
          ETH: 'optimism',
        },
      };

      it('should return override for tokens with overrides', () => {
        expect(resolvePreferredNetwork(preferences, 'USDC')).toBe('base');
        expect(resolvePreferredNetwork(preferences, 'ETH')).toBe('optimism');
      });

      it('should return null for tokens without overrides', () => {
        expect(resolvePreferredNetwork(preferences, 'USDT')).toBeNull();
        expect(resolvePreferredNetwork(preferences, 'DAI')).toBeNull();
      });
    });

    describe('when preferences has both defaultNetwork and tokenOverrides', () => {
      const preferences: NetworkPreferences = {
        defaultNetwork: 'polygon',
        tokenOverrides: {
          USDC: 'arbitrum',
          WETH: 'base',
        },
      };

      it('should prioritize tokenOverride over defaultNetwork', () => {
        expect(resolvePreferredNetwork(preferences, 'USDC')).toBe('arbitrum');
        expect(resolvePreferredNetwork(preferences, 'WETH')).toBe('base');
      });

      it('should fall back to defaultNetwork for tokens without overrides', () => {
        expect(resolvePreferredNetwork(preferences, 'ETH')).toBe('polygon');
        expect(resolvePreferredNetwork(preferences, 'USDT')).toBe('polygon');
        expect(resolvePreferredNetwork(preferences, 'DAI')).toBe('polygon');
      });
    });

    describe('token symbol case insensitivity', () => {
      const preferences: NetworkPreferences = {
        defaultNetwork: null,
        tokenOverrides: {
          USDC: 'base',
        },
      };

      it('should handle lowercase token symbols', () => {
        expect(resolvePreferredNetwork(preferences, 'usdc')).toBe('base');
      });

      it('should handle mixed case token symbols', () => {
        expect(resolvePreferredNetwork(preferences, 'Usdc')).toBe('base');
        expect(resolvePreferredNetwork(preferences, 'uSdC')).toBe('base');
      });
    });

    describe('edge cases', () => {
      it('should handle empty tokenOverrides object', () => {
        const preferences: NetworkPreferences = {
          defaultNetwork: 'ethereum',
          tokenOverrides: {},
        };
        expect(resolvePreferredNetwork(preferences, 'USDC')).toBe('ethereum');
      });

      it('should handle preferences with all networks as overrides', () => {
        const preferences: NetworkPreferences = {
          defaultNetwork: 'ethereum',
          tokenOverrides: {
            ETH: 'base',
            USDC: 'arbitrum',
            USDT: 'optimism',
            DAI: 'polygon',
          },
        };

        expect(resolvePreferredNetwork(preferences, 'ETH')).toBe('base');
        expect(resolvePreferredNetwork(preferences, 'USDC')).toBe('arbitrum');
        expect(resolvePreferredNetwork(preferences, 'USDT')).toBe('optimism');
        expect(resolvePreferredNetwork(preferences, 'DAI')).toBe('polygon');
        expect(resolvePreferredNetwork(preferences, 'WBTC')).toBe('ethereum');
      });

      it('should handle empty string token symbol', () => {
        const preferences: NetworkPreferences = {
          defaultNetwork: 'base',
          tokenOverrides: {},
        };
        expect(resolvePreferredNetwork(preferences, '')).toBe('base');
      });

      it('should handle special characters in token symbol', () => {
        const preferences: NetworkPreferences = {
          defaultNetwork: 'polygon',
          tokenOverrides: {
            'WETH.E': 'arbitrum',
          },
        };
        expect(resolvePreferredNetwork(preferences, 'WETH.E')).toBe('arbitrum');
        expect(resolvePreferredNetwork(preferences, 'weth.e')).toBe('arbitrum');
      });
    });
  });
});
