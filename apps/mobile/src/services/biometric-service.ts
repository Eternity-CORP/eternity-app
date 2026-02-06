/**
 * Biometric Authentication Service
 * Handles device authentication (Face ID, Touch ID, PIN)
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('BiometricService');

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const APP_LOCK_ENABLED_KEY = 'app_lock_enabled';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricStatus {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

/**
 * Check if device supports biometric authentication
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricType = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: hasHardware,
      biometricType,
      isEnrolled,
    };
  } catch (error) {
    log.error('Failed to get biometric status', error);
    return {
      isAvailable: false,
      biometricType: 'none',
      isEnrolled: false,
    };
  }
}

/**
 * Authenticate user with biometrics or device passcode
 */
export async function authenticate(
  promptMessage: string = 'Подтвердите вход в E-Y'
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await getBiometricStatus();

    if (!status.isAvailable) {
      log.warn('Biometric hardware not available');
      // Fall back to allowing access if no biometric hardware
      return { success: true };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Использовать пароль',
      cancelLabel: 'Отмена',
      disableDeviceFallback: false, // Allow device PIN/password as fallback
    });

    if (result.success) {
      log.info('Authentication successful');
      return { success: true };
    }

    log.warn('Authentication failed', { error: result.error });
    return {
      success: false,
      error: getErrorMessage(result.error),
    };
  } catch (error) {
    log.error('Authentication error', error);
    return {
      success: false,
      error: 'Ошибка аутентификации',
    };
  }
}

/**
 * Authenticate before sensitive operations (sending, signing)
 */
export async function authenticateForTransaction(
  promptMessage: string = 'Подтвердите транзакцию'
): Promise<{ success: boolean; error?: string }> {
  return authenticate(promptMessage);
}

/**
 * Check if app lock is enabled
 */
export async function isAppLockEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY);
    // Default to true for security (if wallet exists)
    return value !== 'false';
  } catch {
    return true;
  }
}

/**
 * Enable or disable app lock
 */
export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
    log.info('App lock setting updated', { enabled });
  } catch (error) {
    log.error('Failed to update app lock setting', error);
    throw error;
  }
}

/**
 * Check if biometric authentication is enabled (user preference)
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometric authentication
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      // Verify biometrics work before enabling
      const result = await authenticate('Подтвердите для включения биометрии');
      if (!result.success) {
        throw new Error(result.error || 'Не удалось подтвердить биометрию');
      }
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    log.info('Biometric setting updated', { enabled });
  } catch (error) {
    log.error('Failed to update biometric setting', error);
    throw error;
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Touch ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Биометрия';
  }
}

/**
 * Convert LocalAuthentication error to user-friendly message
 */
function getErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'user_cancel':
      return 'Отменено пользователем';
    case 'system_cancel':
      return 'Отменено системой';
    case 'not_enrolled':
      return 'Биометрия не настроена на устройстве';
    case 'lockout':
      return 'Слишком много попыток. Попробуйте позже';
    case 'lockout_permanent':
      return 'Биометрия заблокирована. Используйте пароль устройства';
    case 'authentication_failed':
      return 'Не удалось распознать';
    default:
      return 'Ошибка аутентификации';
  }
}
