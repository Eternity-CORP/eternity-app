/**
 * Privacy Settings Service
 *
 * Centralized privacy management for the wallet.
 *
 * Features:
 * - Balance hiding (instant toggle)
 * - Address rotation (privacy mode)
 * - Telemetry/analytics (opt-in)
 * - Screenshot protection
 * - Settings persistence
 *
 * Privacy Philosophy:
 * - Opt-in by default for data collection
 * - User has full control over privacy settings
 * - Settings persist across app restarts
 * - Clear explanations for each setting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enablePrivacyMode as enableAddressRotation,
  disablePrivacyMode as disableAddressRotation,
  isPrivacyModeEnabled as isAddressRotationEnabled,
} from './addressRotationService';

// Types
export interface PrivacySettings {
  balanceHidden: boolean; // Hide balance amounts
  addressRotationEnabled: boolean; // Use fresh addresses
  telemetryEnabled: boolean; // Share anonymous usage data
  screenshotProtectionEnabled: boolean; // Prevent screenshots on sensitive screens
  lastUpdated: number;
}

export interface PrivacySettingsUpdate {
  balanceHidden?: boolean;
  addressRotationEnabled?: boolean;
  telemetryEnabled?: boolean;
  screenshotProtectionEnabled?: boolean;
}

export interface PrivacyFeature {
  id: keyof PrivacySettings;
  title: string;
  description: string;
  detailedDescription: string;
  recommendedValue: boolean;
  requiresRestart: boolean;
  isExperimental: boolean;
}

// Storage keys
const PRIVACY_SETTINGS_KEY = '@privacy_settings';

// Default settings (privacy-first approach)
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  balanceHidden: false, // Off by default for usability
  addressRotationEnabled: false, // Off by default (user must opt-in)
  telemetryEnabled: false, // Off by default (opt-in required)
  screenshotProtectionEnabled: true, // On by default for security
  lastUpdated: Date.now(),
};

/**
 * Get current privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  try {
    const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PrivacySettings;
      return { ...DEFAULT_PRIVACY_SETTINGS, ...parsed };
    }
    return DEFAULT_PRIVACY_SETTINGS;
  } catch (error) {
    console.error('Failed to get privacy settings:', error);
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  updates: PrivacySettingsUpdate
): Promise<PrivacySettings> {
  try {
    const current = await getPrivacySettings();
    const updated: PrivacySettings = {
      ...current,
      ...updates,
      lastUpdated: Date.now(),
    };

    // Sync address rotation with addressRotationService
    if (updates.addressRotationEnabled !== undefined) {
      if (updates.addressRotationEnabled) {
        await enableAddressRotation();
      } else {
        await disableAddressRotation();
      }
    }

    await AsyncStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to update privacy settings:', error);
    throw error;
  }
}

/**
 * Toggle balance hiding
 */
export async function toggleBalanceHidden(): Promise<boolean> {
  const settings = await getPrivacySettings();
  const newValue = !settings.balanceHidden;
  await updatePrivacySettings({ balanceHidden: newValue });
  return newValue;
}

/**
 * Toggle address rotation
 */
export async function toggleAddressRotation(): Promise<boolean> {
  const settings = await getPrivacySettings();
  const newValue = !settings.addressRotationEnabled;
  await updatePrivacySettings({ addressRotationEnabled: newValue });
  return newValue;
}

/**
 * Toggle telemetry
 */
export async function toggleTelemetry(): Promise<boolean> {
  const settings = await getPrivacySettings();
  const newValue = !settings.telemetryEnabled;
  await updatePrivacySettings({ telemetryEnabled: newValue });
  return newValue;
}

/**
 * Toggle screenshot protection
 */
export async function toggleScreenshotProtection(): Promise<boolean> {
  const settings = await getPrivacySettings();
  const newValue = !settings.screenshotProtectionEnabled;
  await updatePrivacySettings({ screenshotProtectionEnabled: newValue });
  return newValue;
}

/**
 * Check if balance is hidden
 */
export async function isBalanceHidden(): Promise<boolean> {
  const settings = await getPrivacySettings();
  return settings.balanceHidden;
}

/**
 * Check if address rotation is enabled
 */
export async function isAddressRotationActive(): Promise<boolean> {
  const settings = await getPrivacySettings();
  return settings.addressRotationEnabled;
}

/**
 * Check if telemetry is enabled
 */
export async function isTelemetryEnabled(): Promise<boolean> {
  const settings = await getPrivacySettings();
  return settings.telemetryEnabled;
}

/**
 * Check if screenshot protection is enabled
 */
export async function isScreenshotProtectionEnabled(): Promise<boolean> {
  const settings = await getPrivacySettings();
  return settings.screenshotProtectionEnabled;
}

/**
 * Get all privacy features with descriptions
 */
export function getPrivacyFeatures(): PrivacyFeature[] {
  return [
    {
      id: 'balanceHidden',
      title: 'Hide Balance',
      description: 'Hide your wallet balance from view',
      detailedDescription:
        'When enabled, your balance will be replaced with "***" throughout the app. This is useful when sharing your screen or showing your wallet to others. Your balance is still calculated and displayed in transaction screens.',
      recommendedValue: false,
      requiresRestart: false,
      isExperimental: false,
    },
    {
      id: 'addressRotationEnabled',
      title: 'Address Rotation',
      description: 'Use fresh addresses for each receive',
      detailedDescription:
        'Enable privacy mode to use a different address for each incoming transaction. This makes it harder for others to track your transaction history. All addresses are derived from your seed phrase and remain accessible.',
      recommendedValue: true,
      requiresRestart: false,
      isExperimental: false,
    },
    {
      id: 'telemetryEnabled',
      title: 'Share Analytics',
      description: 'Help improve the app with anonymous usage data',
      detailedDescription:
        'When enabled, we collect anonymous usage statistics to help improve the app. No personal data, wallet addresses, or transaction details are ever collected. You can disable this at any time.',
      recommendedValue: false,
      requiresRestart: false,
      isExperimental: false,
    },
    {
      id: 'screenshotProtectionEnabled',
      title: 'Screenshot Protection',
      description: 'Prevent screenshots on sensitive screens',
      detailedDescription:
        'When enabled, the app will prevent screenshots on screens displaying sensitive information like seed phrases and private keys. This helps protect your wallet from accidental leaks. Note: This feature may not work on all devices.',
      recommendedValue: true,
      requiresRestart: false,
      isExperimental: false,
    },
  ];
}

/**
 * Get privacy feature by ID
 */
export function getPrivacyFeature(
  id: keyof PrivacySettings
): PrivacyFeature | null {
  const features = getPrivacyFeatures();
  return features.find((f) => f.id === id) || null;
}

/**
 * Reset all privacy settings to defaults
 */
export async function resetPrivacySettings(): Promise<PrivacySettings> {
  try {
    await AsyncStorage.removeItem(PRIVACY_SETTINGS_KEY);

    // Sync address rotation
    await disableAddressRotation();

    return DEFAULT_PRIVACY_SETTINGS;
  } catch (error) {
    console.error('Failed to reset privacy settings:', error);
    throw error;
  }
}

/**
 * Export privacy settings (for backup/debugging)
 */
export async function exportPrivacySettings(): Promise<string> {
  const settings = await getPrivacySettings();
  return JSON.stringify(
    {
      settings,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

/**
 * Import privacy settings (from backup)
 */
export async function importPrivacySettings(
  settingsJson: string
): Promise<PrivacySettings> {
  try {
    const parsed = JSON.parse(settingsJson);
    const settings = parsed.settings as PrivacySettings;

    // Validate settings
    if (typeof settings.balanceHidden !== 'boolean') {
      throw new Error('Invalid balanceHidden value');
    }
    if (typeof settings.addressRotationEnabled !== 'boolean') {
      throw new Error('Invalid addressRotationEnabled value');
    }
    if (typeof settings.telemetryEnabled !== 'boolean') {
      throw new Error('Invalid telemetryEnabled value');
    }
    if (typeof settings.screenshotProtectionEnabled !== 'boolean') {
      throw new Error('Invalid screenshotProtectionEnabled value');
    }

    return await updatePrivacySettings(settings);
  } catch (error: any) {
    console.error('Failed to import privacy settings:', error);
    throw new Error(`Failed to import settings: ${error.message}`);
  }
}

/**
 * Get privacy score (0-100, higher is more private)
 */
export async function getPrivacyScore(): Promise<{
  score: number;
  maxScore: number;
  recommendations: string[];
}> {
  const settings = await getPrivacySettings();
  const features = getPrivacyFeatures();

  let score = 0;
  const maxScore = features.length;
  const recommendations: string[] = [];

  features.forEach((feature) => {
    const currentValue = settings[feature.id] as boolean;
    const recommendedValue = feature.recommendedValue;

    if (currentValue === recommendedValue) {
      score++;
    } else {
      recommendations.push(
        `Consider ${recommendedValue ? 'enabling' : 'disabling'} ${feature.title.toLowerCase()}`
      );
    }
  });

  return {
    score: Math.round((score / maxScore) * 100),
    maxScore: 100,
    recommendations,
  };
}

/**
 * Format balance for display (hide if enabled)
 */
export async function formatBalance(balance: string): Promise<string> {
  const hidden = await isBalanceHidden();
  if (hidden) {
    return '***';
  }
  return balance;
}

/**
 * Format address for display (hide if balance hidden)
 */
export async function formatAddress(
  address: string,
  alwaysShow: boolean = false
): Promise<string> {
  if (alwaysShow) {
    return address;
  }

  const hidden = await isBalanceHidden();
  if (hidden) {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }
  return address;
}

/**
 * Initialize privacy settings
 * Call this on app start to ensure settings are synced
 */
export async function initializePrivacySettings(): Promise<void> {
  try {
    const settings = await getPrivacySettings();

    // Sync address rotation with addressRotationService
    const addressRotationActual = await isAddressRotationEnabled();
    if (settings.addressRotationEnabled !== addressRotationActual) {
      if (settings.addressRotationEnabled) {
        await enableAddressRotation();
      } else {
        await disableAddressRotation();
      }
    }
  } catch (error) {
    console.error('Failed to initialize privacy settings:', error);
  }
}

/**
 * Get privacy tips based on current settings
 */
export async function getPrivacyTips(): Promise<string[]> {
  const settings = await getPrivacySettings();
  const tips: string[] = [];

  if (!settings.balanceHidden) {
    tips.push('💡 Enable "Hide Balance" when sharing your screen to protect your privacy.');
  }

  if (!settings.addressRotationEnabled) {
    tips.push(
      '💡 Enable "Address Rotation" to use fresh addresses for each receive, making it harder to track your transactions.'
    );
  }

  if (settings.telemetryEnabled) {
    tips.push(
      '✓ Thank you for helping us improve the app by sharing anonymous usage data!'
    );
  }

  if (!settings.screenshotProtectionEnabled) {
    tips.push(
      '⚠️ Screenshot protection is disabled. Your seed phrase and private keys can be captured.'
    );
  }

  if (
    !settings.balanceHidden &&
    !settings.addressRotationEnabled &&
    !settings.screenshotProtectionEnabled
  ) {
    tips.push(
      '🔒 Your privacy settings are at their lowest. Consider enabling some privacy features.'
    );
  }

  return tips;
}
