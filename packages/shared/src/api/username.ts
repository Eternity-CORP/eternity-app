/**
 * Username API Module
 * Pure functions that accept ApiClient as first argument.
 */

import type { ApiClient } from './client';
import { ApiError } from './client';

interface UsernameData {
  username: string;
  address: string;
  preferences?: {
    defaultNetwork: string | null;
    tokenOverrides: Record<string, string>;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface UsernameLookupResult {
  address: string;
  preferences?: {
    defaultNetwork: string | null;
    tokenOverrides: Record<string, string>;
  };
}

/**
 * Lookup username -> address with optional preferences
 */
export async function lookupUsername(
  client: ApiClient,
  username: string,
): Promise<UsernameLookupResult | null> {
  const normalized = username.startsWith('@') ? username.slice(1) : username;

  try {
    const data = await client.get<ApiResponse<UsernameData>>(
      `/api/username/${encodeURIComponent(normalized)}`,
    );

    if (!data.data?.address) return null;

    const result: UsernameLookupResult = { address: data.data.address };

    if (data.data.preferences) {
      result.preferences = data.data.preferences;
    }

    return result;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    return null;
  }
}

/**
 * Reverse lookup: address -> username
 */
export async function lookupAddressByUsername(
  client: ApiClient,
  address: string,
): Promise<string | null> {
  try {
    const data = await client.get<ApiResponse<UsernameData>>(
      `/api/username/address/${encodeURIComponent(address)}`,
    );
    return data.data?.username || null;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    return null;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(
  client: ApiClient,
  username: string,
): Promise<boolean> {
  const normalized = username.startsWith('@') ? username.slice(1) : username;

  const data = await client.get<ApiResponse<{ username: string; available: boolean }>>(
    `/api/username/check/${encodeURIComponent(normalized)}`,
  );
  return data.data?.available || false;
}

export interface RegisterUsernameRequest {
  username: string;
  address: string;
  signature: string;
  timestamp: number;
}

/**
 * Register a new username
 */
export async function registerUsername(
  client: ApiClient,
  request: RegisterUsernameRequest,
): Promise<void> {
  await client.post('/api/username', request);
}

export interface UpdateUsernameRequest {
  newUsername: string;
  address: string;
  signature: string;
  timestamp: number;
}

/**
 * Update username
 */
export async function updateUsername(
  client: ApiClient,
  request: UpdateUsernameRequest,
): Promise<void> {
  await client.put('/api/username', request);
}

export interface DeleteUsernameRequest {
  address: string;
  signature: string;
  timestamp: number;
}

/**
 * Delete username
 */
export async function deleteUsername(
  client: ApiClient,
  request: DeleteUsernameRequest,
): Promise<void> {
  await client.delete('/api/username', request);
}
