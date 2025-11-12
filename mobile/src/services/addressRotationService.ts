/**
 * Address Rotation Service
 *
 * Manages address rotation for enhanced privacy.
 *
 * Features:
 * - Generate fresh receiving addresses
 * - Track address usage
 * - Maintain address history
 * - Privacy mode support
 * - Address reuse detection
 *
 * Privacy Benefits:
 * - Reduces address reuse (improves privacy)
 * - Makes it harder to track user activity
 * - Each receive can use a unique address
 * - All addresses remain accessible (HD wallet)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deriveAccount, getAllAccounts, createNewAccount } from './walletService';
import type { AccountInfo } from './walletService';

// Types
export interface ReceiveAddress {
  address: string;
  derivationIndex: number;
  label: string;
  createdAt: number;
  usedAt?: number; // When first received funds
  isUsed: boolean;
  balance?: string; // Cached balance (optional)
}

export interface AddressRotationConfig {
  privacyModeEnabled: boolean;
  autoRotateOnUse: boolean; // Automatically suggest new address when current one receives funds
  maxUnusedAddresses: number; // Maximum unused addresses to keep generated
}

// Storage keys
const ADDRESS_HISTORY_KEY = '@address_history';
const ROTATION_CONFIG_KEY = '@address_rotation_config';
const CURRENT_RECEIVE_INDEX_KEY = '@current_receive_index';

// Default configuration
const DEFAULT_CONFIG: AddressRotationConfig = {
  privacyModeEnabled: false,
  autoRotateOnUse: true,
  maxUnusedAddresses: 3,
};

/**
 * Get address rotation configuration
 */
export async function getRotationConfig(): Promise<AddressRotationConfig> {
  try {
    const stored = await AsyncStorage.getItem(ROTATION_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Failed to get rotation config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Update address rotation configuration
 */
export async function setRotationConfig(
  config: Partial<AddressRotationConfig>
): Promise<void> {
  try {
    const current = await getRotationConfig();
    const updated = { ...current, ...config };
    await AsyncStorage.setItem(ROTATION_CONFIG_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to set rotation config:', error);
  }
}

/**
 * Enable privacy mode (address rotation)
 */
export async function enablePrivacyMode(): Promise<void> {
  await setRotationConfig({ privacyModeEnabled: true });
}

/**
 * Disable privacy mode
 */
export async function disablePrivacyMode(): Promise<void> {
  await setRotationConfig({ privacyModeEnabled: false });
}

/**
 * Check if privacy mode is enabled
 */
export async function isPrivacyModeEnabled(): Promise<boolean> {
  const config = await getRotationConfig();
  return config.privacyModeEnabled;
}

/**
 * Get address history
 */
async function getAddressHistory(): Promise<ReceiveAddress[]> {
  try {
    const stored = await AsyncStorage.getItem(ADDRESS_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error('Failed to get address history:', error);
    return [];
  }
}

/**
 * Save address history
 */
async function saveAddressHistory(history: ReceiveAddress[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ADDRESS_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save address history:', error);
  }
}

/**
 * Add address to history
 */
async function addToHistory(address: ReceiveAddress): Promise<void> {
  const history = await getAddressHistory();

  // Check if already exists
  const existing = history.find((a) => a.address === address.address);
  if (existing) {
    return;
  }

  history.push(address);

  // Keep last 100 addresses
  const limited = history.slice(-100);

  await saveAddressHistory(limited);
}

/**
 * Mark address as used
 */
export async function markAddressAsUsed(address: string): Promise<void> {
  const history = await getAddressHistory();

  const item = history.find((a) => a.address.toLowerCase() === address.toLowerCase());
  if (item && !item.isUsed) {
    item.isUsed = true;
    item.usedAt = Date.now();
    await saveAddressHistory(history);
  }
}

/**
 * Get current receive index
 */
async function getCurrentReceiveIndex(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(CURRENT_RECEIVE_INDEX_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
    return 0; // Start with first account
  } catch (error) {
    console.error('Failed to get current receive index:', error);
    return 0;
  }
}

/**
 * Set current receive index
 */
async function setCurrentReceiveIndex(index: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENT_RECEIVE_INDEX_KEY, String(index));
  } catch (error) {
    console.error('Failed to set current receive index:', error);
  }
}

/**
 * Get current receiving address (respects privacy mode)
 */
export async function getCurrentReceiveAddress(): Promise<ReceiveAddress> {
  const config = await getRotationConfig();

  if (config.privacyModeEnabled) {
    // Privacy mode: return a fresh unused address
    return await getFreshReceiveAddress();
  } else {
    // Standard mode: return primary address (index 0)
    const accounts = await getAllAccounts();
    const primaryAccount = accounts[0] || (await deriveAccount(0));

    const receiveAddress: ReceiveAddress = {
      address: primaryAccount.address,
      derivationIndex: primaryAccount.index,
      label: primaryAccount.name,
      createdAt: Date.now(),
      isUsed: true, // Primary address is always "used"
    };

    return receiveAddress;
  }
}

/**
 * Generate a fresh receiving address
 */
export async function getFreshReceiveAddress(): Promise<ReceiveAddress> {
  const history = await getAddressHistory();

  // Find first unused address
  const unused = history.find((a) => !a.isUsed);

  if (unused) {
    return unused;
  }

  // No unused addresses, generate a new one
  return await generateNewReceiveAddress();
}

/**
 * Generate a new receiving address
 */
export async function generateNewReceiveAddress(): Promise<ReceiveAddress> {
  const accounts = await getAllAccounts();

  // Get next index
  const nextIndex = accounts.length > 0 ? Math.max(...accounts.map((a) => a.index)) + 1 : 0;

  // Derive new account
  const newAccount = await deriveAccount(nextIndex);

  // Create receive address record
  const receiveAddress: ReceiveAddress = {
    address: newAccount.address,
    derivationIndex: newAccount.index,
    label: `Receive Address ${nextIndex + 1}`,
    createdAt: Date.now(),
    isUsed: false,
  };

  // Add to history
  await addToHistory(receiveAddress);

  // Create account in wallet service (for balance tracking)
  await createNewAccount();

  return receiveAddress;
}

/**
 * Get all receiving addresses (used and unused)
 */
export async function getAllReceiveAddresses(): Promise<ReceiveAddress[]> {
  return await getAddressHistory();
}

/**
 * Get unused receiving addresses
 */
export async function getUnusedReceiveAddresses(): Promise<ReceiveAddress[]> {
  const history = await getAddressHistory();
  return history.filter((a) => !a.isUsed);
}

/**
 * Get used receiving addresses
 */
export async function getUsedReceiveAddresses(): Promise<ReceiveAddress[]> {
  const history = await getAddressHistory();
  return history.filter((a) => a.isUsed);
}

/**
 * Rotate to next receive address
 * (Generates new address and makes it current)
 */
export async function rotateReceiveAddress(): Promise<ReceiveAddress> {
  const config = await getRotationConfig();

  if (!config.privacyModeEnabled) {
    throw new Error('Privacy mode is not enabled. Cannot rotate addresses.');
  }

  // Generate new address
  const newAddress = await generateNewReceiveAddress();

  // Set as current
  await setCurrentReceiveIndex(newAddress.derivationIndex);

  return newAddress;
}

/**
 * Check if an address has been used
 */
export async function isAddressUsed(address: string): Promise<boolean> {
  const history = await getAddressHistory();
  const item = history.find((a) => a.address.toLowerCase() === address.toLowerCase());
  return item?.isUsed ?? false;
}

/**
 * Get address info
 */
export async function getAddressInfo(address: string): Promise<ReceiveAddress | null> {
  const history = await getAddressHistory();
  return history.find((a) => a.address.toLowerCase() === address.toLowerCase()) || null;
}

/**
 * Get privacy statistics
 */
export async function getPrivacyStats(): Promise<{
  totalAddresses: number;
  usedAddresses: number;
  unusedAddresses: number;
  privacyModeEnabled: boolean;
  addressReuseRate: number; // Percentage (lower is better for privacy)
}> {
  const history = await getAddressHistory();
  const config = await getRotationConfig();

  const totalAddresses = history.length;
  const usedAddresses = history.filter((a) => a.isUsed).length;
  const unusedAddresses = totalAddresses - usedAddresses;

  // Calculate address reuse rate
  // If using single address (not privacy mode), reuse rate is 100%
  // If using many addresses, reuse rate is lower
  const addressReuseRate = totalAddresses === 0 ? 100 : (usedAddresses / totalAddresses) * 100;

  return {
    totalAddresses,
    usedAddresses,
    unusedAddresses,
    privacyModeEnabled: config.privacyModeEnabled,
    addressReuseRate: Math.round(addressReuseRate),
  };
}

/**
 * Suggest whether to rotate address based on usage
 */
export async function shouldSuggestRotation(): Promise<{
  shouldRotate: boolean;
  reason?: string;
}> {
  const config = await getRotationConfig();

  if (!config.privacyModeEnabled) {
    return { shouldRotate: false, reason: 'Privacy mode is not enabled' };
  }

  if (!config.autoRotateOnUse) {
    return { shouldRotate: false, reason: 'Auto-rotate is disabled' };
  }

  const unused = await getUnusedReceiveAddresses();

  if (unused.length === 0) {
    return { shouldRotate: true, reason: 'No unused addresses available' };
  }

  if (unused.length < config.maxUnusedAddresses) {
    return { shouldRotate: true, reason: 'Low unused addresses available' };
  }

  return { shouldRotate: false };
}

/**
 * Initialize address history with primary account
 */
export async function initializeAddressHistory(): Promise<void> {
  const history = await getAddressHistory();

  // If already initialized, skip
  if (history.length > 0) {
    return;
  }

  // Get primary account
  const accounts = await getAllAccounts();
  if (accounts.length === 0) {
    return;
  }

  const primaryAccount = accounts[0];

  // Add primary account to history
  const primaryAddress: ReceiveAddress = {
    address: primaryAccount.address,
    derivationIndex: primaryAccount.index,
    label: primaryAccount.name,
    createdAt: Date.now(),
    isUsed: true, // Primary address is always considered used
  };

  await addToHistory(primaryAddress);
}

/**
 * Clear all address history (USE WITH CAUTION)
 */
export async function clearAddressHistory(): Promise<void> {
  await AsyncStorage.removeItem(ADDRESS_HISTORY_KEY);
  await AsyncStorage.removeItem(CURRENT_RECEIVE_INDEX_KEY);
}

/**
 * Export address history (for backup)
 */
export async function exportAddressHistory(): Promise<string> {
  const history = await getAddressHistory();
  const config = await getRotationConfig();

  return JSON.stringify({
    history,
    config,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}
