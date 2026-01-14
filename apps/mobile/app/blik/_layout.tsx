/**
 * BLIK Flow Layout
 */

import { Stack } from 'expo-router';

export default function BlikLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="request" />
      <Stack.Screen name="waiting" />
      <Stack.Screen name="enter-code" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
