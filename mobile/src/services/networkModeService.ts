import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSelectedNetwork, getSelectedNetwork } from './networkService';
import type { Network } from '../config/env';
import { clearTransactionCache } from './blockchain/etherscanService';
import { clearProviderCache } from './blockchain/ethereumProvider';

export type NetworkMode = 'demo' | 'live';

// Event listeners for mode changes
type ModeChangeListener = (mode: NetworkMode, network: Network) => void;
const modeChangeListeners: Set<ModeChangeListener> = new Set();

/**
 * Subscribe to network mode changes
 */
export function onNetworkModeChange(listener: ModeChangeListener): () => void {
  modeChangeListeners.add(listener);
  return () => modeChangeListeners.delete(listener);
}

/**
 * Notify all listeners about mode change
 */
function notifyModeChange(mode: NetworkMode, network: Network) {
  modeChangeListeners.forEach(listener => listener(mode, network));
}

const STORAGE_MODE_KEY = '@eternity-wallet:network-mode';

let currentMode: NetworkMode | null = null;

/**
 * Get the current network mode (demo = testnets, live = mainnet)
 */
export async function getNetworkMode(): Promise<NetworkMode> {
  if (currentMode !== null) {
    return currentMode;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_MODE_KEY);
    if (stored === 'demo' || stored === 'live') {
      currentMode = stored;
      return currentMode;
    }
  } catch (error) {
    console.error('Failed to load network mode:', error);
  }

  currentMode = 'demo';
  return currentMode;
}

/**
 * Set the network mode
 * When switching to live, automatically switches to mainnet
 * When switching to demo, automatically switches to sepolia
 * 
 * IMPORTANT: This also clears all cached data to ensure fresh state
 */
export async function setNetworkMode(mode: NetworkMode): Promise<void> {
  try {
    const previousMode = currentMode;
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
    currentMode = mode;

    const currentNetwork = await getSelectedNetwork();
    let targetNetwork: Network = currentNetwork;
    
    if (mode === 'live' && currentNetwork !== 'mainnet') {
      targetNetwork = 'mainnet';
      await setSelectedNetwork('mainnet');
    } else if (mode === 'demo' && currentNetwork === 'mainnet') {
      targetNetwork = 'sepolia';
      await setSelectedNetwork('sepolia');
    }

    // Clear all caches when mode changes to ensure fresh data
    if (previousMode !== mode) {
      console.log(`🗑️ [NetworkMode] Clearing caches due to mode change: ${previousMode} → ${mode}`);
      clearProviderCache();
      // Clear transaction cache for all networks (we don't know the address here)
      // The HomeScreen will re-fetch when it gets the change notification
    }

    console.log(`✅ Network mode switched to: ${mode} (network: ${targetNetwork})`);
    
    // Notify listeners about the change
    notifyModeChange(mode, targetNetwork);
  } catch (error) {
    console.error('Failed to set network mode:', error);
    throw error;
  }
}

/**
 * Check if a network is available in the current mode
 */
export function isNetworkAvailable(network: Network, mode: NetworkMode): boolean {
  if (mode === 'live') {
    return network === 'mainnet';
  }
  return network === 'sepolia' || network === 'holesky';
}

/**
 * Get available networks for the current mode
 */
export function getAvailableNetworks(mode: NetworkMode): Network[] {
  if (mode === 'live') {
    return ['mainnet'];
  }
  return ['sepolia', 'holesky'];
}

/**
 * Get display info for mode
 */
export function getModeDisplayInfo(mode: NetworkMode): {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
} {
  if (mode === 'live') {
    return {
      title: 'Live Mode',
      subtitle: 'Real transactions with real money',
      icon: 'wallet',
      color: '#4CAF50',
    };
  }
  return {
    title: 'Demo Mode',
    subtitle: 'Test transactions with test tokens',
    icon: 'flask',
    color: '#FF9800',
  };
}

/**
 * Clear the in-memory cache (useful for testing)
 */
export function clearModeCache(): void {
  currentMode = null;
}
