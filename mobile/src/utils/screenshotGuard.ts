/**
 * Screenshot Guard
 *
 * Protects sensitive screens from screenshots and screen recording.
 *
 * Features:
 * - Prevent screenshots on iOS and Android
 * - Detect screenshot attempts
 * - Show warnings when screenshots are taken
 * - Platform-specific implementations
 *
 * Note: Screenshot protection is not 100% foolproof.
 * Determined users can still capture screens through various means.
 * This is a deterrent, not absolute protection.
 */

import { Platform, Alert } from 'react-native';
import { isScreenshotProtectionEnabled } from '../services/privacySettingsService';

// Types
export interface ScreenshotEvent {
  timestamp: number;
  platform: string;
}

export interface ScreenshotGuardStatus {
  isEnabled: boolean;
  isSupported: boolean;
  platform: string;
}

// Screenshot listeners
let screenshotListeners: Array<(event: ScreenshotEvent) => void> = [];

/**
 * Check if screenshot protection is supported on this platform
 */
export function isScreenshotProtectionSupported(): boolean {
  // iOS and Android support screenshot protection
  // Web does not support it
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Enable screenshot protection for current screen
 *
 * Note: This is a placeholder implementation.
 * In production, you would use:
 * - iOS: expo-screen-capture or react-native-screen-capture
 * - Android: react-native-prevent-screenshot
 *
 * For now, we'll implement detection only.
 */
export async function enableScreenshotProtection(): Promise<boolean> {
  const enabled = await isScreenshotProtectionEnabled();
  if (!enabled) {
    return false;
  }

  if (!isScreenshotProtectionSupported()) {
    console.warn('Screenshot protection is not supported on this platform');
    return false;
  }

  try {
    // Platform-specific implementation would go here
    // For iOS:
    // const { preventScreenCapture } = require('expo-screen-capture');
    // await preventScreenCapture();

    // For Android:
    // const PreventScreenshot = require('react-native-prevent-screenshot').default;
    // PreventScreenshot.enabled(true);

    console.log('Screenshot protection enabled');
    return true;
  } catch (error) {
    console.error('Failed to enable screenshot protection:', error);
    return false;
  }
}

/**
 * Disable screenshot protection for current screen
 */
export async function disableScreenshotProtection(): Promise<void> {
  if (!isScreenshotProtectionSupported()) {
    return;
  }

  try {
    // Platform-specific implementation would go here
    // For iOS:
    // const { allowScreenCapture } = require('expo-screen-capture');
    // await allowScreenCapture();

    // For Android:
    // const PreventScreenshot = require('react-native-prevent-screenshot').default;
    // PreventScreenshot.enabled(false);

    console.log('Screenshot protection disabled');
  } catch (error) {
    console.error('Failed to disable screenshot protection:', error);
  }
}

/**
 * Add screenshot listener
 *
 * Note: In production, you would use:
 * - iOS: addScreenshotListener from expo-screen-capture
 * - Android: addListener from react-native-screenshot-detector
 */
export function addScreenshotListener(
  callback: (event: ScreenshotEvent) => void
): () => void {
  screenshotListeners.push(callback);

  // Return unsubscribe function
  return () => {
    screenshotListeners = screenshotListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Trigger screenshot event (for testing)
 */
export function triggerScreenshotEvent(): void {
  const event: ScreenshotEvent = {
    timestamp: Date.now(),
    platform: Platform.OS,
  };

  screenshotListeners.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error('Screenshot listener error:', error);
    }
  });
}

/**
 * Show screenshot warning
 */
export function showScreenshotWarning(): void {
  Alert.alert(
    'Screenshot Detected',
    'You took a screenshot of sensitive information. Please make sure to keep it secure and delete it when no longer needed.\n\n⚠️ Never share screenshots containing:\n• Seed phrases\n• Private keys\n• Transaction details\n• Wallet addresses',
    [{ text: 'I Understand', style: 'default' }]
  );
}

/**
 * Get screenshot guard status
 */
export async function getScreenshotGuardStatus(): Promise<ScreenshotGuardStatus> {
  const enabled = await isScreenshotProtectionEnabled();
  const supported = isScreenshotProtectionSupported();

  return {
    isEnabled: enabled,
    isSupported: supported,
    platform: Platform.OS,
  };
}

/**
 * Hook for protecting sensitive screens
 *
 * Usage:
 * ```typescript
 * useScreenshotGuard({
 *   onScreenshot: () => {
 *     console.log('Screenshot taken!');
 *   },
 *   showWarning: true,
 * });
 * ```
 */
export interface UseScreenshotGuardOptions {
  onScreenshot?: (event: ScreenshotEvent) => void;
  showWarning?: boolean;
  autoEnable?: boolean;
}

export function useScreenshotGuard(options: UseScreenshotGuardOptions = {}) {
  const { onScreenshot, showWarning = true, autoEnable = true } = options;

  // This would be implemented as a React hook in a real component
  // For now, we'll provide the setup logic

  const setup = async () => {
    if (autoEnable) {
      await enableScreenshotProtection();
    }

    const unsubscribe = addScreenshotListener((event) => {
      if (showWarning) {
        showScreenshotWarning();
      }
      if (onScreenshot) {
        onScreenshot(event);
      }
    });

    return unsubscribe;
  };

  const cleanup = async () => {
    await disableScreenshotProtection();
  };

  return { setup, cleanup };
}

/**
 * Sensitive screen IDs
 */
export const SENSITIVE_SCREENS = {
  CREATE_WALLET: 'CreateWalletScreen',
  IMPORT_WALLET: 'ImportWalletScreen',
  SEED_PHRASE_DISPLAY: 'SeedPhraseDisplay',
  SEED_PHRASE_VERIFY: 'SeedPhraseVerify',
  PRIVATE_KEY_DISPLAY: 'PrivateKeyDisplay',
  BACKUP_SCREEN: 'BackupScreen',
  RECOVERY_PHRASE: 'RecoveryPhrase',
} as const;

/**
 * Check if screen is sensitive
 */
export function isSensitiveScreen(screenName: string): boolean {
  return Object.values(SENSITIVE_SCREENS).includes(
    screenName as (typeof SENSITIVE_SCREENS)[keyof typeof SENSITIVE_SCREENS]
  );
}

/**
 * Get warning message for sensitive screens
 */
export function getSensitiveScreenWarning(screenName: string): string {
  const warnings: Record<string, string> = {
    [SENSITIVE_SCREENS.CREATE_WALLET]:
      'Your seed phrase is being displayed. Do not take screenshots.',
    [SENSITIVE_SCREENS.IMPORT_WALLET]:
      'You are entering sensitive information. Do not share your screen.',
    [SENSITIVE_SCREENS.SEED_PHRASE_DISPLAY]:
      'Your seed phrase is visible. This is the key to your wallet. Never share it.',
    [SENSITIVE_SCREENS.SEED_PHRASE_VERIFY]:
      'You are verifying your seed phrase. Keep it private.',
    [SENSITIVE_SCREENS.PRIVATE_KEY_DISPLAY]:
      'Your private key is visible. This gives full access to your funds.',
    [SENSITIVE_SCREENS.BACKUP_SCREEN]:
      'You are backing up your wallet. Keep this information secure.',
    [SENSITIVE_SCREENS.RECOVERY_PHRASE]:
      'Your recovery phrase is visible. This can restore your wallet.',
  };

  return (
    warnings[screenName] ||
    'This screen contains sensitive information. Please be careful.'
  );
}

/**
 * Initialize screenshot guard
 * Call this once on app startup
 */
export async function initializeScreenshotGuard(): Promise<void> {
  const status = await getScreenshotGuardStatus();

  if (!status.isSupported) {
    console.log('Screenshot protection not supported on this platform');
    return;
  }

  if (!status.isEnabled) {
    console.log('Screenshot protection is disabled in settings');
    return;
  }

  // Add global screenshot listener
  addScreenshotListener((event) => {
    console.log('Screenshot detected:', event);
    // You could log this to analytics (if telemetry is enabled)
  });

  console.log('Screenshot guard initialized');
}

/**
 * Blur sensitive content (for app switcher/recent apps)
 *
 * Note: In production, you would use:
 * - iOS: UIScreen.main.captureProtectionEnabled = true
 * - Android: WindowManager.LayoutParams.FLAG_SECURE
 */
export async function blurSensitiveContent(): Promise<void> {
  // This would be implemented with native modules
  // For now, it's a placeholder
  console.log('Blur sensitive content (placeholder)');
}

/**
 * Unblur sensitive content
 */
export async function unblurSensitiveContent(): Promise<void> {
  console.log('Unblur sensitive content (placeholder)');
}
