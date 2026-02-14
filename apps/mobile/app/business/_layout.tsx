/**
 * Business Wallet Section Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/src/contexts';

export default function BusinessLayout() {
  const { theme: dynamicTheme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: dynamicTheme.colors.background },
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/proposals" />
      <Stack.Screen name="[id]/transfer" />
    </Stack>
  );
}
