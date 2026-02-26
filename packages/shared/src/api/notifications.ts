/**
 * Notification API functions
 * Shared between web and mobile for registering/unregistering push tokens.
 */

import type { ApiClient } from './client';
import type {
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  UnregisterDeviceRequest,
  UnregisterDeviceResponse,
} from '../types/notification';

/**
 * Register a device for push notifications
 */
export function registerPushDevice(
  client: ApiClient,
  data: RegisterDeviceRequest,
): Promise<RegisterDeviceResponse> {
  return client.post<RegisterDeviceResponse>('/notifications/register', data);
}

/**
 * Unregister a device from push notifications
 */
export function unregisterPushDevice(
  client: ApiClient,
  data: UnregisterDeviceRequest,
): Promise<UnregisterDeviceResponse> {
  return client.post<UnregisterDeviceResponse>('/notifications/unregister', data);
}
