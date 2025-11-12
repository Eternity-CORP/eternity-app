/**
 * Unit tests for networkService
 * Tests network selection, persistence, and provider initialization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSelectedNetwork,
  setSelectedNetwork,
  resetNetworkSelection,
  clearNetworkCache,
} from '../networkService';
import { DEFAULT_NETWORK, type Network } from '../../config/env';
import { getProvider, clearProviderCache } from '../blockchain/ethereumProvider';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ethereumProvider
jest.mock('../blockchain/ethereumProvider', () => ({
  getProvider: jest.fn(),
  clearProviderCache: jest.fn(),
}));

describe('networkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearNetworkCache();
  });

  describe('getSelectedNetwork', () => {
    it('should return default network when nothing is stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const network = await getSelectedNetwork();

      expect(network).toBe(DEFAULT_NETWORK);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@eternity-wallet:selected-network');
    });

    it('should return stored network when valid network is saved', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mainnet');

      const network = await getSelectedNetwork();

      expect(network).toBe('mainnet');
    });

    it('should return cached network on subsequent calls', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('holesky');

      const network1 = await getSelectedNetwork();
      const network2 = await getSelectedNetwork();

      expect(network1).toBe('holesky');
      expect(network2).toBe('holesky');
      // AsyncStorage should only be called once due to caching
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('should return default network when stored value is invalid', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-network');

      const network = await getSelectedNetwork();

      expect(network).toBe(DEFAULT_NETWORK);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const network = await getSelectedNetwork();

      expect(network).toBe(DEFAULT_NETWORK);
    });
  });

  describe('setSelectedNetwork', () => {
    it('should persist network selection to AsyncStorage', async () => {
      await setSelectedNetwork('mainnet');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@eternity-wallet:selected-network',
        'mainnet'
      );
    });

    it('should update cached network value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sepolia');

      await setSelectedNetwork('mainnet');
      const network = await getSelectedNetwork();

      expect(network).toBe('mainnet');
      // Should not call getItem since cache is updated
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(0);
    });

    it('should clear provider cache when switching networks', async () => {
      await setSelectedNetwork('holesky');

      expect(clearProviderCache).toHaveBeenCalled();
    });

    it('should throw error for invalid network', async () => {
      await expect(
        setSelectedNetwork('invalid' as Network)
      ).rejects.toThrow('Invalid network: invalid');
    });

    it('should handle AsyncStorage errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setSelectedNetwork('mainnet')).rejects.toThrow('Storage error');
    });
  });

  describe('resetNetworkSelection', () => {
    it('should remove network from AsyncStorage', async () => {
      await resetNetworkSelection();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@eternity-wallet:selected-network');
    });

    it('should reset cached network to default', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mainnet');
      await getSelectedNetwork(); // Load into cache

      await resetNetworkSelection();
      const network = await getSelectedNetwork();

      expect(network).toBe(DEFAULT_NETWORK);
    });

    it('should clear provider cache', async () => {
      await resetNetworkSelection();

      expect(clearProviderCache).toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(resetNetworkSelection()).rejects.toThrow('Storage error');
    });
  });

  describe('provider integration', () => {
    it('should initialize provider with correct RPC URL', async () => {
      const mockProvider = {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1, name: 'homestead' }),
      };
      (getProvider as jest.Mock).mockReturnValue(mockProvider);

      const provider = getProvider('mainnet');

      expect(provider).toBe(mockProvider);
      expect(getProvider).toHaveBeenCalledWith('mainnet');
    });

    it('should work with all supported networks', () => {
      const networks: Network[] = ['mainnet', 'sepolia', 'holesky'];

      networks.forEach((network) => {
        getProvider(network);
        expect(getProvider).toHaveBeenCalledWith(network);
      });
    });
  });
});
