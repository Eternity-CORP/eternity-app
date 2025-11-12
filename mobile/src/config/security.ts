export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCKOUT_MINUTES = 15; // lockout period after too many attempts

// Secure storage configuration notes:
// - iOS: use Keychain with strongest accessibility available
// - Android: Keystore-backed storage via expo-secure-store
export const SECURESTORE_IOS_ACCESSIBILITY: any = (global as any).Expo?.SecureStore?.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY || undefined;

