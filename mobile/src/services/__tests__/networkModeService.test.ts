import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock networkService
jest.mock('../networkService', () => ({
  setSelectedNetwork: jest.fn(),
  getSelectedNetwork: jest.fn(() => Promise.resolve('sepolia')),
}));

// Mock blockchain services
jest.mock('../blockchain/etherscanService', () => ({
  clearTransactionCache: jest.fn(),
}));

jest.mock('../blockchain/ethereumProvider', () => ({
  clearProviderCache: jest.fn(),
}));

import {
  getNetworkMode,
  setNetworkMode,
  isNetworkAvailable,
  getAvailableNetworks,
  getModeDisplayInfo,
  clearModeCache,
  onNetworkModeChange,
} from '../networkModeService';

describe('networkModeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearModeCache(); // Reset internal state
  });

  describe('getNetworkMode', () => {
    it('should return demo as default mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const mode = await getNetworkMode();
      
      expect(mode).toBe('demo');
    });

    it('should return saved mode from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('live');
      
      const mode = await getNetworkMode();
      
      expect(mode).toBe('live');
    });

    it('should cache the mode after first call', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('demo');
      
      await getNetworkMode();
      await getNetworkMode();
      
      // Should only read from storage once due to caching
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('setNetworkMode', () => {
    it('should save mode to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await setNetworkMode('live');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@eternity-wallet:network-mode', 'live');
    });

    it('should switch to demo mode', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await setNetworkMode('demo');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@eternity-wallet:network-mode', 'demo');
    });
  });

  describe('isNetworkAvailable', () => {
    it('should return true for mainnet in live mode', () => {
      expect(isNetworkAvailable('mainnet', 'live')).toBe(true);
    });

    it('should return false for testnet in live mode', () => {
      expect(isNetworkAvailable('sepolia', 'live')).toBe(false);
    });

    it('should return true for testnets in demo mode', () => {
      expect(isNetworkAvailable('sepolia', 'demo')).toBe(true);
      expect(isNetworkAvailable('holesky', 'demo')).toBe(true);
    });

    it('should return false for mainnet in demo mode', () => {
      expect(isNetworkAvailable('mainnet', 'demo')).toBe(false);
    });
  });

  describe('getAvailableNetworks', () => {
    it('should return only mainnet for live mode', () => {
      const networks = getAvailableNetworks('live');
      expect(networks).toEqual(['mainnet']);
    });

    it('should return testnets for demo mode', () => {
      const networks = getAvailableNetworks('demo');
      expect(networks).toContain('sepolia');
      expect(networks).toContain('holesky');
      expect(networks).not.toContain('mainnet');
    });
  });

  describe('getModeDisplayInfo', () => {
    it('should return correct info for live mode', () => {
      const info = getModeDisplayInfo('live');
      
      expect(info.title).toBe('Live Mode');
      expect(info.color).toBe('#4CAF50'); // Green
      expect(info).toHaveProperty('subtitle');
      expect(info).toHaveProperty('icon');
    });

    it('should return correct info for demo mode', () => {
      const info = getModeDisplayInfo('demo');
      
      expect(info.title).toBe('Demo Mode');
      expect(info.color).toBe('#FF9800'); // Orange
      expect(info).toHaveProperty('subtitle');
      expect(info).toHaveProperty('icon');
    });
  });

  describe('onNetworkModeChange', () => {
    it('should allow subscribing to mode changes', () => {
      const listener = jest.fn();
      
      const unsubscribe = onNetworkModeChange(listener);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      
      const unsubscribe = onNetworkModeChange(listener);
      unsubscribe();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
