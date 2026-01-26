import { Stack } from 'expo-router';

export default function SwapLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="token-selector" />
    </Stack>
  );
}
