/**
 * Deposit Flow Layout
 */

import { Stack } from 'expo-router';

export default function DepositLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
