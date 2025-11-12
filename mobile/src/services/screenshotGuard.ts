/**
 * Screenshot Guard Service
 *
 * Prevents screenshots and screen recordings on sensitive screens
 * (seed phrase display, private keys, etc.)
 *
 * Platform support:
 * - Android: preventScreenCaptureAsync()
 * - iOS: preventScreenCaptureAsync() (iOS 11+)
 * - Web: No support
 */

import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Enable screenshot protection
 * Call this when entering sensitive screens
 */
export async function enableScreenshotProtection(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[ScreenshotGuard] Not supported on web');
    return;
  }

  try {
    await ScreenCapture.preventScreenCaptureAsync();
    console.log('[ScreenshotGuard] Protection enabled');
  } catch (error) {
    console.warn('[ScreenshotGuard] Failed to enable protection:', error);
    // Fallback: continue without protection
  }
}

/**
 * Disable screenshot protection
 * Call this when leaving sensitive screens
 */
export async function disableScreenshotProtection(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await ScreenCapture.allowScreenCaptureAsync();
    console.log('[ScreenshotGuard] Protection disabled');
  } catch (error) {
    console.warn('[ScreenshotGuard] Failed to disable protection:', error);
  }
}

/**
 * Check if screenshot protection is supported on this platform
 */
export function isScreenshotProtectionSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

/**
 * Add screenshot event listener
 * Note: This only works on iOS
 */
export function addScreenshotListener(callback: () => void): (() => void) | null {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const subscription = ScreenCapture.addScreenshotListener(callback);

  return () => {
    subscription?.remove();
  };
}

/**
 * React Hook for screenshot protection
 * Automatically enables/disables protection on mount/unmount
 */
export function useScreenshotProtection(enabled: boolean = true) {
  if (!enabled) return;

  // Enable on mount
  enableScreenshotProtection();

  // Disable on unmount
  return () => {
    disableScreenshotProtection();
  };
}
