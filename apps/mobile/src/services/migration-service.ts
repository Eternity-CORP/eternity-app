/**
 * Migration Service
 * Handles one-time migration flags for app updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Migration flags
const MIGRATION_TEST_ACCOUNTS_SHOWN = '@ey/migration_test_accounts_shown';

/**
 * Check if the test accounts migration modal has been shown
 */
export async function hasMigrationModalBeenShown(): Promise<boolean> {
  try {
    const shown = await AsyncStorage.getItem(MIGRATION_TEST_ACCOUNTS_SHOWN);
    return shown === 'true';
  } catch (error) {
    console.error('Error checking migration flag:', error);
    return false;
  }
}

/**
 * Mark the test accounts migration modal as shown
 */
export async function markMigrationModalAsShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_TEST_ACCOUNTS_SHOWN, 'true');
  } catch (error) {
    console.error('Error setting migration flag:', error);
  }
}

/**
 * Reset migration flags (for testing purposes)
 */
export async function resetMigrationFlags(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_TEST_ACCOUNTS_SHOWN);
  } catch (error) {
    console.error('Error resetting migration flags:', error);
  }
}
