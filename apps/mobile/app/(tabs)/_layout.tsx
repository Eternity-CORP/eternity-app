import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused: boolean;
  activeColor: string;
}) {
  return (
    <View style={[styles.iconContainer, props.focused && { backgroundColor: props.activeColor + '10' }]}>
      <FontAwesome size={22} name={props.name} color={props.color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme: dynamicTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: dynamicTheme.colors.textPrimary,
        tabBarInactiveTintColor: dynamicTheme.colors.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: dynamicTheme.colors.background,
            borderTopColor: dynamicTheme.colors.glassBorder,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} activeColor={dynamicTheme.colors.textPrimary} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="magic" color={color} focused={focused} activeColor={dynamicTheme.colors.textPrimary} />,
        }}
      />
      <Tabs.Screen
        name="shard"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="user" color={color} focused={focused} activeColor={dynamicTheme.colors.textPrimary} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null, // Hide from tab bar (accessible via Home)
          headerShown: false,
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.glassBorder,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.textPrimary + '10',
  },
});
