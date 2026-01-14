/**
 * Profile Section Layout
 */

import { Stack } from 'expo-router';
import { theme } from '@/src/constants/theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
