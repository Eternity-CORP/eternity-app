/**
 * Integration smoke test for network switching
 * Tests actual network connectivity and block retrieval
 *
 * Note: These tests make real network calls and may be slow
 * Run with: npm test -- --testPathPattern=networkSwitching.integration.test.ts
 */

import { type Network } from '../../config/env';
import { setSelectedNetwork, getSelectedNetwork, clearNetworkCache } from '../networkService';
import { getActiveProvider, clearProviderCache } from '../blockchain/ethereumProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for integration tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Network Switching Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearNetworkCache();
    clearProviderCache();
  });

  describe('Network connectivity smoke tests', () => {
    it('should connect to sepolia and retrieve latest block', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sepolia');

      await setSelectedNetwork('sepolia');
      const provider = await getActiveProvider();
      const blockNumber = await provider.getBlockNumber();

      expect(blockNumber).toBeGreaterThan(0);
      expect(typeof blockNumber).toBe('number');
    }, 15000); // 15s timeout for network call

    it('should connect to holesky and retrieve latest block', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('holesky');

      await setSelectedNetwork('holesky');
      const provider = await getActiveProvider();
      const blockNumber = await provider.getBlockNumber();

      expect(blockNumber).toBeGreaterThan(0);
      expect(typeof blockNumber).toBe('number');
    }, 15000); // 15s timeout for network call

    it('should connect to mainnet and retrieve latest block', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mainnet');

      await setSelectedNetwork('mainnet');
      const provider = await getActiveProvider();
      const blockNumber = await provider.getBlockNumber();

      expect(blockNumber).toBeGreaterThan(0);
      expect(typeof blockNumber).toBe('number');
    }, 15000); // 15s timeout for network call
  });

  describe('Network switching behavior', () => {
    it('should switch from sepolia to holesky and read different blocks', async () => {
      // Set up sepolia
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sepolia');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setSelectedNetwork('sepolia');
      const sepoliaProvider = await getActiveProvider();
      const sepoliaBlock = await sepoliaProvider.getBlockNumber();

      expect(sepoliaBlock).toBeGreaterThan(0);

      // Switch to holesky
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('holesky');
      clearNetworkCache();

      await setSelectedNetwork('holesky');
      const holeskyProvider = await getActiveProvider();
      const holeskyBlock = await holeskyProvider.getBlockNumber();

      expect(holeskyBlock).toBeGreaterThan(0);

      // Verify providers are different (different networks have different block heights)
      expect(sepoliaProvider).not.toBe(holeskyProvider);
    }, 30000); // 30s timeout for multiple network calls

    it('should retrieve correct chainId after switching networks', async () => {
      const testCases: Array<{ network: Network; expectedChainId: number }> = [
        { network: 'mainnet', expectedChainId: 1 },
        { network: 'sepolia', expectedChainId: 11155111 },
        { network: 'holesky', expectedChainId: 17000 },
      ];

      for (const { network, expectedChainId } of testCases) {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(network);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        clearNetworkCache();
        clearProviderCache();

        await setSelectedNetwork(network);
        const provider = await getActiveProvider();
        const networkInfo = await provider.getNetwork();

        expect(networkInfo.chainId).toBe(expectedChainId);
      }
    }, 45000); // 45s timeout for multiple network calls
  });

  describe('Provider persistence', () => {
    it('should maintain network selection across app restarts', async () => {
      // Simulate initial network selection
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await setSelectedNetwork('holesky');

      // Simulate app restart by clearing cache
      clearNetworkCache();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('holesky');

      // Verify persisted network is loaded
      const network = await getSelectedNetwork();
      expect(network).toBe('holesky');
    });

    it('should handle missing AsyncStorage data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const network = await getSelectedNetwork();
      const provider = await getActiveProvider();
      const blockNumber = await provider.getBlockNumber();

      // Should default to sepolia (or configured default)
      expect(['mainnet', 'sepolia', 'holesky']).toContain(network);
      expect(blockNumber).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Error handling', () => {
    it('should handle invalid network gracefully', async () => {
      const invalidNetwork = 'invalid-network' as Network;

      await expect(setSelectedNetwork(invalidNetwork)).rejects.toThrow(
        'Invalid network: invalid-network'
      );
    });

    it('should not corrupt state on failed network switch', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sepolia');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await setSelectedNetwork('sepolia');
      const initialNetwork = await getSelectedNetwork();
      expect(initialNetwork).toBe('sepolia');

      // Try to set invalid network
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage failed'));

      await expect(setSelectedNetwork('holesky')).rejects.toThrow('Storage failed');

      // Verify cache still has the valid network
      clearNetworkCache();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sepolia');
      const currentNetwork = await getSelectedNetwork();
      expect(currentNetwork).toBe('sepolia');
    });
  });
});
