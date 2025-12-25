/**
 * useNetwork Hook
 * 
 * Provides reactive network state management for components.
 * Automatically updates when network mode or selected network changes.
 */
import { useState, useEffect, useCallback } from 'react';
import { getSelectedNetwork, setSelectedNetwork } from '../services/networkService';
import { 
  getNetworkMode, 
  setNetworkMode, 
  onNetworkModeChange,
  getAvailableNetworks,
  type NetworkMode 
} from '../services/networkModeService';
import { clearProviderCache } from '../services/blockchain/ethereumProvider';
import { clearTransactionCache } from '../services/blockchain/etherscanService';
import type { Network } from '../config/env';

export interface NetworkState {
  network: Network;
  mode: NetworkMode;
  availableNetworks: Network[];
  isLive: boolean;
  isDemo: boolean;
  loading: boolean;
}

export interface NetworkActions {
  switchMode: (mode: NetworkMode) => Promise<void>;
  switchNetwork: (network: Network) => Promise<void>;
  refresh: () => Promise<void>;
  clearAllCaches: (address?: string) => Promise<void>;
}

export function useNetwork(): NetworkState & NetworkActions {
  const [network, setNetwork] = useState<Network>('sepolia');
  const [mode, setMode] = useState<NetworkMode>('demo');
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      try {
        const [currentNetwork, currentMode] = await Promise.all([
          getSelectedNetwork(),
          getNetworkMode(),
        ]);
        setNetwork(currentNetwork);
        setMode(currentMode);
      } catch (error) {
        console.error('[useNetwork] Failed to load initial state:', error);
      } finally {
        setLoading(false);
      }
    };
    loadState();
  }, []);

  // Subscribe to mode changes
  useEffect(() => {
    const unsubscribe = onNetworkModeChange((newMode, newNetwork) => {
      console.log(`[useNetwork] Mode changed: ${newMode}, network: ${newNetwork}`);
      setMode(newMode);
      setNetwork(newNetwork);
    });
    return unsubscribe;
  }, []);

  // Switch mode handler
  const switchMode = useCallback(async (newMode: NetworkMode) => {
    setLoading(true);
    try {
      await setNetworkMode(newMode);
      // State will be updated via the listener
    } catch (error) {
      console.error('[useNetwork] Failed to switch mode:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch network handler
  const switchNetwork = useCallback(async (newNetwork: Network) => {
    setLoading(true);
    try {
      await setSelectedNetwork(newNetwork);
      setNetwork(newNetwork);
      clearProviderCache();
    } catch (error) {
      console.error('[useNetwork] Failed to switch network:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh state from storage
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [currentNetwork, currentMode] = await Promise.all([
        getSelectedNetwork(),
        getNetworkMode(),
      ]);
      setNetwork(currentNetwork);
      setMode(currentMode);
    } catch (error) {
      console.error('[useNetwork] Failed to refresh state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all caches
  const clearAllCaches = useCallback(async (address?: string) => {
    console.log('[useNetwork] Clearing all caches...');
    clearProviderCache();
    if (address) {
      await clearTransactionCache(address);
    }
  }, []);

  return {
    network,
    mode,
    availableNetworks: getAvailableNetworks(mode),
    isLive: mode === 'live',
    isDemo: mode === 'demo',
    loading,
    switchMode,
    switchNetwork,
    refresh,
    clearAllCaches,
  };
}

export default useNetwork;

