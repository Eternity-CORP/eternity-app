import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (e) {
    console.error('Error checking biometric availability:', e);
    return false;
  }
}

/**
 * Get the type of biometric authentication supported
 */
export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  } catch (e) {
    return 'Biometric';
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to continue'
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use PIN',
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (e: any) {
    console.error('Biometric authentication error:', e);
    return {
      success: false,
      error: e.message || 'Authentication failed',
    };
  }
}

/**
 * Check if biometric authentication is enabled by user
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Enable or disable biometric authentication
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Error setting biometric preference:', e);
  }
}

/**
 * Check if app should require biometric authentication
 * (only if biometrics are available AND enabled by user)
 *
 * If biometrics are enabled but not available, automatically disable them
 * to prevent infinite authentication loops
 */
export async function shouldRequireBiometric(): Promise<boolean> {
  const available = await isBiometricAvailable();
  const enabled = await isBiometricEnabled();

  // If enabled but not available, automatically disable to prevent lock-out
  if (enabled && !available) {
    console.log('[Biometric] Biometrics were enabled but are no longer available. Auto-disabling.');
    await setBiometricEnabled(false);
    return false;
  }

  return available && enabled;
}
