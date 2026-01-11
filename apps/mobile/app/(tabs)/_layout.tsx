import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../src/constants/theme';

// Simple icon components (will be replaced with proper icons later)
const HomeIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconPlaceholder, { borderColor: color }]}>
    <View style={[styles.homeRoof, { backgroundColor: color }]} />
  </View>
);

const WalletIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconPlaceholder, { borderColor: color, backgroundColor: color }]} />
);

const ShardIcon = ({ color }: { color: string }) => (
  <View style={[styles.iconCircle, { borderColor: color }]} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <WalletIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="shard"
        options={{
          title: 'Shard',
          tabBarIcon: ({ color }) => <ShardIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    height: 80,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeRoof: {
    width: 12,
    height: 8,
    position: 'absolute',
    top: -6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 12,
  },
});
