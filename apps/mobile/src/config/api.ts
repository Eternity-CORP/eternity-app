/**
 * API Configuration
 * Handles API URL detection for both development and production
 */

import Constants from 'expo-constants';

/**
 * Get API base URL
 * In development, uses Expo's hostUri to get the correct IP address
 * In production, uses EXPO_PUBLIC_API_URL environment variable
 */
export function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // In development with Expo, get the host from debuggerHost or hostUri
  // This gives us the IP:port of the Expo dev server (e.g., "192.168.1.100:8081")
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    // Extract just the IP address (remove port)
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }

  // Fallback for development (won't work on physical devices)
  return 'http://localhost:3000';
}

// Export the URL for use across the app
export const API_BASE_URL = getApiBaseUrl();
