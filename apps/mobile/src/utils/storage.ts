/**
 * Storage Utility
 * Provides AsyncStorage-like API using expo-file-system
 * for Expo Go compatibility
 */

import { File, Directory, Paths } from 'expo-file-system';

// Storage directory
const STORAGE_DIR_NAME = 'app-storage';

// In-memory cache for performance
const memoryCache = new Map<string, string>();

/**
 * Get the storage directory
 */
function getStorageDir(): Directory {
  return new Directory(Paths.document, STORAGE_DIR_NAME);
}

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  const dir = getStorageDir();
  if (!dir.exists) {
    await dir.create();
  }
}

/**
 * Sanitize key to be safe for file system
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get file for a key
 */
function getFile(key: string): File {
  const sanitizedKey = sanitizeKey(key);
  return new File(getStorageDir(), `${sanitizedKey}.json`);
}

/**
 * Get item from storage
 */
export async function getItem(key: string): Promise<string | null> {
  try {
    // Check memory cache first
    if (memoryCache.has(key)) {
      return memoryCache.get(key) || null;
    }

    await ensureStorageDir();
    const file = getFile(key);

    if (!file.exists) {
      return null;
    }

    const content = await file.text();
    memoryCache.set(key, content);
    return content;
  } catch (error) {
    console.error('Storage getItem error:', error);
    return null;
  }
}

/**
 * Set item in storage
 */
export async function setItem(key: string, value: string): Promise<void> {
  try {
    await ensureStorageDir();
    const file = getFile(key);
    await file.write(value);
    memoryCache.set(key, value);
  } catch (error) {
    console.error('Storage setItem error:', error);
    throw error;
  }
}

/**
 * Remove item from storage
 */
export async function removeItem(key: string): Promise<void> {
  try {
    const file = getFile(key);

    if (file.exists) {
      await file.delete();
    }

    memoryCache.delete(key);
  } catch (error) {
    console.error('Storage removeItem error:', error);
  }
}

/**
 * Clear all storage
 */
export async function clear(): Promise<void> {
  try {
    const dir = getStorageDir();
    if (dir.exists) {
      await dir.delete();
    }
    memoryCache.clear();
  } catch (error) {
    console.error('Storage clear error:', error);
  }
}

/**
 * Get all keys
 */
export async function getAllKeys(): Promise<string[]> {
  try {
    await ensureStorageDir();
    const dir = getStorageDir();
    const entries = await dir.list();
    return entries
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => file.name.replace('.json', ''));
  } catch (error) {
    console.error('Storage getAllKeys error:', error);
    return [];
  }
}

// Export as default object for AsyncStorage-like API
export default {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
};
