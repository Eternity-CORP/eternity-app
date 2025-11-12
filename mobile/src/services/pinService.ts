import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import { SECURESTORE_IOS_ACCESSIBILITY, PIN_MAX_ATTEMPTS, PIN_LOCKOUT_MINUTES } from '../config/security';

const PIN_HASH_KEY = 'eternity_pin_hash';
const PIN_SALT_KEY = 'eternity_pin_salt';
const PIN_ATTEMPTS_KEY = 'eternity_pin_attempts';
const PIN_LOCKOUT_UNTIL_KEY = 'eternity_pin_lockout_until';

function getNow(): number { return Date.now(); }

async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, SECURESTORE_IOS_ACCESSIBILITY ? { keychainAccessible: SECURESTORE_IOS_ACCESSIBILITY } : undefined);
}

async function getSecureItem(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

function hashPin(pin: string, salt: string): string {
  // PBKDF2 with reasonable iterations to derive a stable hash
  const key = CryptoJS.PBKDF2(pin, CryptoJS.enc.Hex.parse(salt), {
    keySize: 256 / 32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
}

export async function isPinSet(): Promise<boolean> {
  const hash = await getSecureItem(PIN_HASH_KEY);
  return Boolean(hash);
}

export async function clearPin(): Promise<void> {
  await deleteSecureItem(PIN_HASH_KEY);
  await deleteSecureItem(PIN_SALT_KEY);
  await deleteSecureItem(PIN_ATTEMPTS_KEY);
  await deleteSecureItem(PIN_LOCKOUT_UNTIL_KEY);
}

export async function setPin(pin: string): Promise<void> {
  // Validate: minimum 4 characters
  if (!pin || pin.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }

  // Allow only letters and digits (alphanumeric)
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(pin)) {
    throw new Error('Password can only contain letters and digits');
  }

  const saltBytes = CryptoJS.lib.WordArray.random(16);
  const saltHex = CryptoJS.enc.Hex.stringify(saltBytes);
  const hash = hashPin(pin, saltHex);
  await setSecureItem(PIN_SALT_KEY, saltHex);
  await setSecureItem(PIN_HASH_KEY, hash);
  await setSecureItem(PIN_ATTEMPTS_KEY, '0');
  await deleteSecureItem(PIN_LOCKOUT_UNTIL_KEY);
}

export async function getLockoutInfo(): Promise<{ locked: boolean; remainingMs: number }> {
  const until = await getSecureItem(PIN_LOCKOUT_UNTIL_KEY);
  const ts = until ? Number(until) : 0;
  const now = getNow();
  if (ts > now) {
    return { locked: true, remainingMs: ts - now };
  }
  return { locked: false, remainingMs: 0 };
}

async function incrementAttempts(): Promise<number> {
  const current = Number((await getSecureItem(PIN_ATTEMPTS_KEY)) || '0');
  const next = current + 1;
  await setSecureItem(PIN_ATTEMPTS_KEY, String(next));
  if (next >= PIN_MAX_ATTEMPTS) {
    const lockoutUntil = getNow() + PIN_LOCKOUT_MINUTES * 60 * 1000;
    await setSecureItem(PIN_LOCKOUT_UNTIL_KEY, String(lockoutUntil));
  }
  return next;
}

export async function resetAttempts(): Promise<void> {
  await setSecureItem(PIN_ATTEMPTS_KEY, '0');
  await deleteSecureItem(PIN_LOCKOUT_UNTIL_KEY);
}

export async function verifyPin(pin: string): Promise<{ success: boolean; attempts?: number; locked?: boolean; remainingMs?: number }>{
  const { locked, remainingMs } = await getLockoutInfo();
  if (locked) {
    return { success: false, locked: true, remainingMs };
  }

  const salt = await getSecureItem(PIN_SALT_KEY);
  const storedHash = await getSecureItem(PIN_HASH_KEY);
  if (!salt || !storedHash) {
    return { success: false };
  }

  const computed = hashPin(pin, salt);
  if (computed === storedHash) {
    await resetAttempts();
    return { success: true };
  }

  const attempts = await incrementAttempts();
  const postLock = await getLockoutInfo();
  return { success: false, attempts, locked: postLock.locked, remainingMs: postLock.remainingMs };
}

