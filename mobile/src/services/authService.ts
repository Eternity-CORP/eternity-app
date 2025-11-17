import { API_BASE_URL } from '../config/env';
import { networkLogger } from './networkLogger';
import { getOrCreateDeviceToken } from './deviceTokenService';

function getBaseUrl(): string | null {
  if (!API_BASE_URL) {
    console.warn('[authService] EXPO_PUBLIC_API_BASE_URL is not set; auth API calls are disabled');
    return null;
  }
  return API_BASE_URL.replace(/\/$/, '');
}

export async function loginWithWallet(walletAddress: string): Promise<string | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const url = `${baseUrl}/auth/login`;
  const deviceToken = await getOrCreateDeviceToken();

  try {
    const response = await networkLogger.loggedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ walletAddress, deviceToken }),
    });

    if (!response.ok) {
      console.warn(`[authService] /auth/login failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const token = typeof data?.access_token === 'string' ? data.access_token : null;
    if (!token) {
      console.warn('[authService] /auth/login response did not contain access_token');
    }
    return token;
  } catch (error: any) {
    console.warn('[authService] Failed to login:', error?.message || error);
    return null;
  }
}
