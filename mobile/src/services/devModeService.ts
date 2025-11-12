/**
 * Dev Mode Service
 *
 * Provides development tools for testing, including:
 * - Dev mode toggle
 * - Factory reset (wipe keychain)
 * - Dev-only features
 *
 * IMPORTANT: This should only be available in development builds.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_SEED_KEY,
  STORAGE_PRIVATE_KEY,
  STORAGE_ENC_KEY_KEY,
  STORAGE_WALLET_META_KEY
} from '../config/env';

const DEV_MODE_KEY = '@eternity_dev_mode';
const APP_STATE_PREFIX = '@eternity_';

/**
 * Check if dev mode is enabled
 */
export async function isDevModeEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DEV_MODE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking dev mode:', error);
    return false;
  }
}

/**
 * Toggle dev mode on/off
 */
export async function toggleDevMode(): Promise<boolean> {
  try {
    const currentMode = await isDevModeEnabled();
    const newMode = !currentMode;
    await AsyncStorage.setItem(DEV_MODE_KEY, String(newMode));
    return newMode;
  } catch (error) {
    console.error('Error toggling dev mode:', error);
    throw error;
  }
}

/**
 * Set dev mode explicitly
 */
export async function setDevMode(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DEV_MODE_KEY, String(enabled));
  } catch (error) {
    console.error('Error setting dev mode:', error);
    throw error;
  }
}

/**
 * Wipe Keychain - Full factory reset
 *
 * Deletes all secure storage items including:
 * - Seed phrase (encrypted)
 * - Encryption key
 * - Wallet metadata
 * - Private keys (legacy)
 * - All app state from AsyncStorage
 *
 * This effectively returns the app to "first launch" state.
 */
export async function wipeKeychain(): Promise<void> {
  try {
    console.log('[DevMode] Starting full keychain wipe...');

    // 1. Delete from SecureStore (native) or localStorage (web)
    const secureKeys = [
      STORAGE_SEED_KEY,
      STORAGE_PRIVATE_KEY,
      STORAGE_ENC_KEY_KEY,
      STORAGE_WALLET_META_KEY,
    ];

    if (Platform.OS === 'web') {
      // Web: clear localStorage
      for (const key of secureKeys) {
        try {
          window.localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key} from localStorage:`, e);
        }
      }
    } else {
      // Native: use SecureStore
      for (const key of secureKeys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          console.warn(`Failed to delete ${key} from SecureStore:`, e);
        }
      }
    }

    // 2. Clear all AsyncStorage keys with app prefix
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(key => key.startsWith(APP_STATE_PREFIX));

      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
        console.log(`[DevMode] Cleared ${appKeys.length} AsyncStorage keys`);
      }
    } catch (e) {
      console.warn('Failed to clear AsyncStorage:', e);
    }

    // 3. Reset dev mode itself
    await AsyncStorage.setItem(DEV_MODE_KEY, 'false');

    console.log('[DevMode] Keychain wipe completed successfully');
  } catch (error) {
    console.error('[DevMode] Error wiping keychain:', error);
    throw error;
  }
}

/**
 * Get dev mode status information
 */
export async function getDevModeInfo(): Promise<{
  devMode: boolean;
  platform: string;
  hasWallet: boolean;
}> {
  try {
    const devMode = await isDevModeEnabled();

    let hasWallet = false;
    if (Platform.OS === 'web') {
      hasWallet = Boolean(window.localStorage.getItem(STORAGE_SEED_KEY));
    } else {
      const seed = await SecureStore.getItemAsync(STORAGE_SEED_KEY);
      hasWallet = Boolean(seed);
    }

    return {
      devMode,
      platform: Platform.OS,
      hasWallet,
    };
  } catch (error) {
    console.error('Error getting dev mode info:', error);
    return {
      devMode: false,
      platform: Platform.OS,
      hasWallet: false,
    };
  }
}

/**
 * Check if we're running in development environment
 * This checks __DEV__ flag set by React Native/Expo
 */
export function isDevelopmentBuild(): boolean {
  return __DEV__;
}

/**
 * Should show dev features?
 * Dev features are shown only in development builds AND when dev mode is enabled
 */
export async function shouldShowDevFeatures(): Promise<boolean> {
  if (!isDevelopmentBuild()) {
    return false;
  }
  return await isDevModeEnabled();
}
