/**
 * Scheduled Payment Create Flow Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts';

export default function ScheduledCreateLayout() {
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
