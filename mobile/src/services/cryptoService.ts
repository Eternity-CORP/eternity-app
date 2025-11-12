import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SECURESTORE_IOS_ACCESSIBILITY } from '../config/security';
import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';
import { STORAGE_SEED_KEY as SEED_KEY, STORAGE_PRIVATE_KEY as PRIVATE_KEY, STORAGE_ENC_KEY_KEY as ENC_KEY_KEY, STORAGE_WALLET_META_KEY as META_KEY } from '../config/env';

export interface AccountMeta {
  index: number;
  name: string;
  address: string;
}

export interface WalletMeta {
  accounts: AccountMeta[];
  activeAccountIndex: number;
}

// Cross-platform storage wrappers: use SecureStore on native, localStorage on web
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  // Use platform Keychain/Keystore with proper accessibility flags (iOS: ThisDeviceOnly)
  const options = SECURESTORE_IOS_ACCESSIBILITY ? { keychainAccessible: SECURESTORE_IOS_ACCESSIBILITY } : undefined;
  await SecureStore.setItemAsync(key, value, options);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await getItem(ENC_KEY_KEY);
  if (!key) {
    const bytes = ethers.utils.randomBytes(32);
    key = ethers.utils.hexlify(bytes);
    await setItem(ENC_KEY_KEY, key);
  }
  return key;
}

function encrypt(text: string, key: string): string {
  return CryptoJS.AES.encrypt(text, key).toString();
}

function decrypt(cipher: string, key: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, key);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext || null;
  } catch (e) {
    return null;
  }
}

// Seed management (encrypted)
export async function saveSeed(seed: string): Promise<void> {
  const key = await getOrCreateEncryptionKey();
  const encSeed = encrypt(seed, key);
  await setItem(SEED_KEY, encSeed);
}

export async function getSeed(): Promise<string | null> {
  const key = await getOrCreateEncryptionKey();
  const encSeed = await getItem(SEED_KEY);
  const seed = encSeed ? decrypt(encSeed, key) : null;
  return seed;
}

// Wallet metadata (accounts + active index) stored as JSON (not sensitive)
export async function getWalletMeta(): Promise<WalletMeta | null> {
  const raw = await getItem(META_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as WalletMeta; } catch { return null; }
}

export async function saveWalletMeta(meta: WalletMeta): Promise<void> {
  await setItem(META_KEY, JSON.stringify(meta));
}

export async function deleteWallet(): Promise<void> {
  await deleteItem(SEED_KEY);
  await deleteItem(PRIVATE_KEY); // legacy cleanup if present
  await deleteItem(META_KEY);
}

export async function isWalletExists(): Promise<boolean> {
  const encSeed = await getItem(SEED_KEY);
  return Boolean(encSeed);
}

// Legacy helpers for backward compatibility
export async function saveWallet(seed: string, privateKey?: string): Promise<void> {
  await saveSeed(seed);
  // Do not store private keys per new policy
}

export async function getWallet(): Promise<{ seed: string | null; privateKey: string | null }> {
  const seed = await getSeed();
  return { seed, privateKey: null };
}

// Account metadata operations
export async function renameAccount(index: number, name: string): Promise<void> {
  const meta = (await getWalletMeta()) || { accounts: [], activeAccountIndex: 0 };
  const acc = meta.accounts.find(a => a.index === index);
  if (acc) { acc.name = name; await saveWalletMeta(meta); }
}

export async function setActiveAccountIndex(index: number): Promise<void> {
  const meta = (await getWalletMeta()) || { accounts: [], activeAccountIndex: 0 };
  meta.activeAccountIndex = index;
  await saveWalletMeta(meta);
}

export async function getActiveAccountIndex(): Promise<number> {
  const meta = await getWalletMeta();
  return meta?.activeAccountIndex ?? 0;
}
