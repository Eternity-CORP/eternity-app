/**
 * Receive Section Layout
 */

import { Stack } from 'expo-router';
import { theme } from '@/src/constants/theme';

export default function ReceiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
