/**
 * Scheduled Payment Create Flow Layout
 */

import { Stack } from 'expo-router';
import { theme } from '@/src/constants/theme';

export default function ScheduledCreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
