jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string | null> = {};
  return {
    setItem: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    removeItem: jest.fn(async (k: string) => {
      delete store[k];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTelemetryEnabled, setTelemetryEnabled, trackEvent } from '../telemetryService';

describe('telemetryService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is disabled by default', async () => {
    expect(await isTelemetryEnabled()).toBe(false);
  });

  it('does not track when disabled', async () => {
    const result = await trackEvent({ name: 'app_open' });
    expect(result).toBe(false);
  });

  it('tracks when enabled', async () => {
    await setTelemetryEnabled(true);
    const result = await trackEvent({ name: 'app_open', properties: { source: 'test' } });
    expect(result).toBe(true);
  });

  it('can be disabled again', async () => {
    await setTelemetryEnabled(true);
    expect(await isTelemetryEnabled()).toBe(true);
    await setTelemetryEnabled(false);
    expect(await isTelemetryEnabled()).toBe(false);
    const result = await trackEvent({ name: 'app_open' });
    expect(result).toBe(false);
  });
});
