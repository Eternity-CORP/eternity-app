import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { SECURESTORE_IOS_ACCESSIBILITY } from '../config/security';

const DEVICE_TOKEN_KEY = '@eternity_device_token';

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

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  const options = SECURESTORE_IOS_ACCESSIBILITY
    ? { keychainAccessible: SECURESTORE_IOS_ACCESSIBILITY }
    : undefined;
  await SecureStore.setItemAsync(key, value, options);
}

export async function getOrCreateDeviceToken(): Promise<string> {
  try {
    const existing = await getItem(DEVICE_TOKEN_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }

    const bytes = ethers.utils.randomBytes(32);
    const token = ethers.utils.hexlify(bytes);
    await setItem(DEVICE_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.warn('[deviceTokenService] Failed to get or create device token:', error);
    const fallback = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    return fallback;
  }
}
