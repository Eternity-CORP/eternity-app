import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { theme } from '@/src/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.buttonPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <TabBarIcon name="credit-card" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shard"
        options={{
          title: 'Shard',
          tabBarIcon: ({ color }) => <TabBarIcon name="id-card" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
