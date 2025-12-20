import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSelectedNetwork, getSelectedNetwork } from './networkService';
import type { Network } from '../config/env';

export type NetworkMode = 'demo' | 'live';

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
 */
export async function setNetworkMode(mode: NetworkMode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
    currentMode = mode;

    const currentNetwork = await getSelectedNetwork();
    
    if (mode === 'live' && currentNetwork !== 'mainnet') {
      await setSelectedNetwork('mainnet');
    } else if (mode === 'demo' && currentNetwork === 'mainnet') {
      await setSelectedNetwork('sepolia');
    }

    console.log(`✅ Network mode switched to: ${mode}`);
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
