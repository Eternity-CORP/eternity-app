/**
 * PushDevice interface
 * Represents a push notification device in the database
 */
export interface PushDevice {
  id: string;
  wallet_address: string;
  push_token: string;
  platform: 'ios' | 'android';
  device_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
