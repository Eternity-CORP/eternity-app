import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@eternity_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }

    const id = uuidv4();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch (error) {
    console.warn('[deviceIdService] Failed to get or create device id:', error);
    return uuidv4();
  }
}
