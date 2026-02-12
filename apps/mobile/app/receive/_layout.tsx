/**
 * Receive Section Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts';

export default function ReceiveLayout() {
  const { theme: dynamicTheme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: dynamicTheme.colors.background },
      }}
    />
  );
}
