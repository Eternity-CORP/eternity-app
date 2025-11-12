import AsyncStorage from '@react-native-async-storage/async-storage';

const TELEMETRY_ENABLED_KEY = '@eternity_telemetry_enabled';

export async function isTelemetryEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(TELEMETRY_ENABLED_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TELEMETRY_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set telemetry preference', e);
  }
}

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
};

/**
 * Track event only when telemetry is enabled (opt-in).
 * By default (no opt-in) this is a no-op.
 */
export async function trackEvent(event: TelemetryEvent): Promise<boolean> {
  const enabled = await isTelemetryEnabled();
  if (!enabled) {
    // No analytics before user consents
    return false;
  }
  // Integrate analytics SDKs here (Segment/Mixpanel/PostHog/etc.)
  // Example (pseudo): analytics.track(event.name, event.properties)
  // For now, log minimally without network calls.
  console.log(`[telemetry] ${event.name}`, event.properties || {});
  return true;
}

