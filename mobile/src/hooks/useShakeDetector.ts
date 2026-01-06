import { useEffect, useRef, useCallback } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';

interface UseShakeDetectorOptions {
  threshold?: number;
  cooldownMs?: number;
  enabled?: boolean;
}

/**
 * Hook to detect device shake gesture
 * @param onShake Callback when shake is detected
 * @param options Configuration options
 */
export const useShakeDetector = (
  onShake: () => void,
  options: UseShakeDetectorOptions = {}
): void => {
  const {
    threshold = 1.8,
    cooldownMs = 1000,
    enabled = true,
  } = options;

  const lastShakeTime = useRef<number>(0);
  const lastMeasurement = useRef<AccelerometerMeasurement | null>(null);

  const handleAccelerometerData = useCallback(
    (data: AccelerometerMeasurement) => {
      const { x, y, z } = data;
      const now = Date.now();

      // Calculate acceleration magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      // Check if it exceeds threshold and cooldown has passed
      if (acceleration > threshold && now - lastShakeTime.current > cooldownMs) {
        lastShakeTime.current = now;
        onShake();
      }

      lastMeasurement.current = data;
    },
    [threshold, cooldownMs, onShake]
  );

  useEffect(() => {
    if (!enabled) return;

    let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;

    const startListening = async () => {
      try {
        // Check if accelerometer is available
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable) {
          console.warn('Accelerometer is not available on this device');
          return;
        }

        // Set update interval (100ms = 10 updates per second)
        Accelerometer.setUpdateInterval(100);

        subscription = Accelerometer.addListener(handleAccelerometerData);
      } catch (error) {
        console.error('Failed to start accelerometer:', error);
      }
    };

    startListening();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enabled, handleAccelerometerData]);
};

export default useShakeDetector;
