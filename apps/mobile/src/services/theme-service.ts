/**
 * Theme Service
 * Handles theme preference persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@ey_app_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Save theme preference to storage
 */
export async function saveThemePreference(theme: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme preference:', error);
  }
}

/**
 * Load theme preference from storage
 */
export async function loadThemePreference(): Promise<ThemeMode> {
  try {
    const theme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'light'; // Default to light theme
  } catch (error) {
    console.error('Failed to load theme preference:', error);
    return 'light';
  }
}

/**
 * Clear theme preference (reset to default)
 */
export async function clearThemePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear theme preference:', error);
  }
}
