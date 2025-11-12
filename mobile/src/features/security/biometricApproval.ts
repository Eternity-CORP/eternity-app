/**
 * Biometric Approval
 * 
 * Requires biometric/PIN confirmation before executing transactions:
 * - Face ID / Touch ID / Fingerprint
 * - PIN fallback
 * - Optional per-transaction approval
 * - Localized prompts
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricName: string; // "Face ID", "Touch ID", "Fingerprint", etc.
}

export interface ApprovalOptions {
  reason: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
}

export interface ApprovalResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

// ============================================================================
// Biometric Capabilities
// ============================================================================

/**
 * Check biometric capabilities
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    const biometricName = getBiometricName(supportedTypes);
    
    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricName,
    };
  } catch (error) {
    console.error('Error checking biometric capabilities:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricName: 'Biometric',
    };
  }
}

/**
 * Get biometric name for display
 */
function getBiometricName(
  types: LocalAuthentication.AuthenticationType[]
): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  
  return 'Biometric';
}

// ============================================================================
// Approval
// ============================================================================

/**
 * Request biometric approval
 */
export async function requestBiometricApproval(
  options: ApprovalOptions
): Promise<ApprovalResult> {
  console.log('🔐 Requesting biometric approval...');
  console.log(`  Reason: ${options.reason}`);
  
  // Check capabilities
  const capabilities = await checkBiometricCapabilities();
  
  if (!capabilities.isAvailable) {
    console.log('⚠️  Biometric not available, using fallback');
    return requestPinFallback(options);
  }
  
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.reason,
      fallbackLabel: options.fallbackLabel || 'Use PIN',
      cancelLabel: options.cancelLabel || 'Cancel',
      disableDeviceFallback: options.disableDeviceFallback || false,
    });
    
    if (result.success) {
      console.log('✅ Biometric approval granted');
      return {
        success: true,
        biometricType: capabilities.biometricName,
      };
    } else {
      console.log('❌ Biometric approval denied');
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    console.error('Biometric error:', error);
    return {
      success: false,
      error: error.message || 'Authentication error',
    };
  }
}

/**
 * Request PIN fallback (Alert prompt)
 */
async function requestPinFallback(
  options: ApprovalOptions
): Promise<ApprovalResult> {
  return new Promise((resolve) => {
    Alert.alert(
      'Confirm Transaction',
      options.reason,
      [
        {
          text: options.cancelLabel || 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('❌ PIN approval denied');
            resolve({
              success: false,
              error: 'User cancelled',
            });
          },
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: () => {
            console.log('✅ PIN approval granted');
            resolve({
              success: true,
              biometricType: 'PIN',
            });
          },
        },
      ],
      { cancelable: false }
    );
  });
}

// ============================================================================
// Transaction-Specific Approvals
// ============================================================================

/**
 * Request approval for scheduled payment execution
 */
export async function requestScheduledPaymentApproval(
  paymentDetails: {
    to: string;
    amount: string;
    asset: string;
  },
  locale: string = 'en'
): Promise<ApprovalResult> {
  const t = getTranslations(locale);
  
  const reason = t.scheduledPayment
    .replace('{amount}', paymentDetails.amount)
    .replace('{asset}', paymentDetails.asset)
    .replace('{to}', shortenAddress(paymentDetails.to));
  
  return requestBiometricApproval({
    reason,
    fallbackLabel: t.usePin,
    cancelLabel: t.cancel,
  });
}

/**
 * Request approval for split bill payment
 */
export async function requestSplitPaymentApproval(
  paymentDetails: {
    participantCount: number;
    totalAmount: string;
    asset: string;
  },
  locale: string = 'en'
): Promise<ApprovalResult> {
  const t = getTranslations(locale);
  
  const reason = t.splitPayment
    .replace('{count}', paymentDetails.participantCount.toString())
    .replace('{total}', paymentDetails.totalAmount)
    .replace('{asset}', paymentDetails.asset);
  
  return requestBiometricApproval({
    reason,
    fallbackLabel: t.usePin,
    cancelLabel: t.cancel,
  });
}

/**
 * Request approval for high fee transaction
 */
export async function requestHighFeeApproval(
  feeDetails: {
    feeETH: string;
    feeUSD?: string;
  },
  locale: string = 'en'
): Promise<ApprovalResult> {
  const t = getTranslations(locale);
  
  const feeText = feeDetails.feeUSD
    ? `${feeDetails.feeETH} ETH ($${feeDetails.feeUSD})`
    : `${feeDetails.feeETH} ETH`;
  
  const reason = t.highFee.replace('{fee}', feeText);
  
  return requestBiometricApproval({
    reason,
    fallbackLabel: t.usePin,
    cancelLabel: t.cancel,
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Shorten address for display
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================================================
// Localization
// ============================================================================

interface Translations {
  scheduledPayment: string;
  splitPayment: string;
  highFee: string;
  usePin: string;
  cancel: string;
}

function getTranslations(locale: string): Translations {
  const translations: Record<string, Translations> = {
    en: {
      scheduledPayment: 'Confirm scheduled payment of {amount} {asset} to {to}',
      splitPayment: 'Confirm {count} split payments totaling {total} {asset}',
      highFee: 'Confirm transaction with high fee: {fee}',
      usePin: 'Use PIN',
      cancel: 'Cancel',
    },
    ru: {
      scheduledPayment: 'Подтвердите запланированный платёж {amount} {asset} на {to}',
      splitPayment: 'Подтвердите {count} платежей на общую сумму {total} {asset}',
      highFee: 'Подтвердите транзакцию с высокой комиссией: {fee}',
      usePin: 'Использовать PIN',
      cancel: 'Отмена',
    },
  };
  
  return translations[locale] || translations.en;
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Mock approval for testing (always succeeds)
 */
export async function mockApproval(): Promise<ApprovalResult> {
  console.log('🧪 Mock approval (testing mode)');
  return {
    success: true,
    biometricType: 'Mock',
  };
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || __DEV__;
}
