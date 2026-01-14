/**
 * Username Service
 * Handles @username registration, lookup, and management
 */

import type { HDNodeWallet } from 'ethers';

// API base URL - use environment variable or default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface UsernameData {
  username: string;
  address: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Lookup username -> address
 */
export async function lookupUsername(username: string): Promise<string | null> {
  // Remove @ prefix if present
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/username/${encodeURIComponent(normalizedUsername)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.warn('Username lookup failed:', response.status);
      return null;
    }

    const data: ApiResponse<UsernameData> = await response.json();
    return data.data?.address || null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error looking up username:', error);
    return null;
  }
}

/**
 * Reverse lookup: address -> username
 */
export async function getUsernameByAddress(address: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/username/address/${encodeURIComponent(address)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.warn('Username reverse lookup failed:', response.status);
      return null;
    }

    const data: ApiResponse<UsernameData> = await response.json();
    return data.data?.username || null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error looking up username by address:', error);
    return null;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  // Remove @ prefix if present
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/username/check/${encodeURIComponent(normalizedUsername)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Username availability check failed:', response.status);
      return false;
    }

    const data: ApiResponse<{ username: string; available: boolean }> = await response.json();
    return data.data?.available || false;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Error checking username availability:', error);
    return false;
  }
}

/**
 * Create signature message for username operations
 */
function createSignatureMessage(
  username: string,
  address: string,
  timestamp: number,
  action: 'claim' | 'update' | 'delete'
): string {
  return `E-Y:${action}:@${username}:${address}:${timestamp}`;
}

/**
 * Register a new username
 */
export async function registerUsername(
  username: string,
  wallet: HDNodeWallet
): Promise<void> {
  // Remove @ prefix if present
  const normalizedUsername = username.startsWith('@')
    ? username.slice(1).toLowerCase()
    : username.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  // Create and sign message
  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'claim');
  const signature = await wallet.signMessage(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: normalizedUsername,
        address,
        signature,
        timestamp,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error?.message || 'Failed to register username');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to register username');
  }
}

/**
 * Update username (change to a new one)
 */
export async function updateUsername(
  newUsername: string,
  wallet: HDNodeWallet
): Promise<void> {
  // Remove @ prefix if present
  const normalizedUsername = newUsername.startsWith('@')
    ? newUsername.slice(1).toLowerCase()
    : newUsername.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  // Create and sign message
  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'update');
  const signature = await wallet.signMessage(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/username`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        newUsername: normalizedUsername,
        address,
        signature,
        timestamp,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update username');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update username');
  }
}

/**
 * Delete username
 */
export async function deleteUsername(
  currentUsername: string,
  wallet: HDNodeWallet
): Promise<void> {
  // Remove @ prefix if present
  const normalizedUsername = currentUsername.startsWith('@')
    ? currentUsername.slice(1).toLowerCase()
    : currentUsername.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  // Create and sign message
  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'delete');
  const signature = await wallet.signMessage(message);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/username`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        address,
        signature,
        timestamp,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error?.message || 'Failed to delete username');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete username');
  }
}

/**
 * Validate username format locally
 */
export function isValidUsernameFormat(username: string): boolean {
  // Remove @ prefix if present
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const regex = /^[a-z][a-z0-9_]{2,19}$/;
  return regex.test(normalizedUsername.toLowerCase());
}
