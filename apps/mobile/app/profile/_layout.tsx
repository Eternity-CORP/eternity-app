/**
 * Profile Section Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function ProfileLayout() {
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
