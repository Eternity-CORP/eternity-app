/**
 * BLIK Receive Flow Layout
 */

import { Stack } from 'expo-router';

export default function BlikReceiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="token" />
      <Stack.Screen name="amount" />
    </Stack>
  );
}
