/**
 * Split Bill Create Flow Layout
 */

import { Stack } from 'expo-router';
import { theme } from '@/src/constants/theme';

export default function SplitCreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
