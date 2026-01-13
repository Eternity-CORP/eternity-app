import { Stack } from 'expo-router';

export default function SendLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="token" />
      <Stack.Screen name="recipient" />
      <Stack.Screen name="amount" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="success" />
    </Stack>
  );
}
