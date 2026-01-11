import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '@/src/store';

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
    <Provider store={store}>
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
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => <TabBarIcon name="wallet" color={color} />,
          }}
        />
        <Tabs.Screen
          name="shard"
          options={{
            title: 'Shard',
            tabBarIcon: ({ color }) => <TabBarIcon name="id-card" color={color} />,
          }}
        />
      </Tabs>
    </Provider>
  );
}
