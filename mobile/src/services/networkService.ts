// Network selection service with AsyncStorage persistence
// Manages the currently active network for the wallet

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NETWORK, type Network } from '../config/env';
import { clearProviderCache } from './blockchain/ethereumProvider';

const STORAGE_NETWORK_KEY = '@eternity-wallet:selected-network';

// In-memory cache to avoid excessive AsyncStorage reads
let currentNetwork: Network | null = null;

/**
 * Get the currently selected network
 * Returns the persisted network or defaults to env config
 */
export async function getSelectedNetwork(): Promise<Network> {
  // Return cached value if available
  if (currentNetwork !== null) {
    return currentNetwork;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_NETWORK_KEY);
    if (stored && isValidNetwork(stored)) {
      currentNetwork = stored as Network;
      return currentNetwork;
    }
  } catch (error) {
    console.error('Failed to load selected network from storage:', error);
  }

  // Fall back to default from env
  currentNetwork = DEFAULT_NETWORK;
  return currentNetwork;
}

/**
 * Set the active network
 * Persists to AsyncStorage and clears provider cache
 */
export async function setSelectedNetwork(network: Network): Promise<void> {
  if (!isValidNetwork(network)) {
    throw new Error(`Invalid network: ${network}`);
  }

  try {
    await AsyncStorage.setItem(STORAGE_NETWORK_KEY, network);
    currentNetwork = network;

    // Clear provider cache to force reconnection with new network
    clearProviderCache();

    console.log(`✅ Network switched to: ${network}`);
  } catch (error) {
    console.error('Failed to persist network selection:', error);
    throw error;
  }
}

/**
 * Reset network selection to default
 */
export async function resetNetworkSelection(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_NETWORK_KEY);
    currentNetwork = DEFAULT_NETWORK;
    clearProviderCache();
    console.log(`🔄 Network reset to default: ${DEFAULT_NETWORK}`);
  } catch (error) {
    console.error('Failed to reset network selection:', error);
    throw error;
  }
}

/**
 * Validate network string
 */
function isValidNetwork(network: string): network is Network {
  return network === 'mainnet' || network === 'sepolia' || network === 'holesky';
}

/**
 * Clear the in-memory cache (useful for testing)
 */
export function clearNetworkCache(): void {
  currentNetwork = null;
}
