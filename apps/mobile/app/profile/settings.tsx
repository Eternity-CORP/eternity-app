/**
 * Profile Settings Screen
 * Menu linking to various settings screens
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';

interface SettingsMenuItem {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  description: string;
  route: string;
}

const MENU_ITEMS: SettingsMenuItem[] = [
  {
    icon: 'globe',
    label: 'Network Preferences',
    description: 'Choose preferred networks for receiving tokens',
    route: '/settings/networks',
  },
  {
    icon: 'at',
    label: 'Username',
    description: 'Manage your global username',
    route: '/profile/username',
  },
  {
    icon: 'shield',
    label: 'Privacy',
    description: 'Control your privacy settings',
    route: '/profile/privacy',
  },
];

export default function ProfileSettingsScreen() {
  const handleMenuPress = (route: string) => {
    router.push(route as never);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Settings" />

      <View style={styles.container}>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <FontAwesome
                  name={item.icon}
                  size={20}
                  color={theme.colors.accent}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, theme.typography.body]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.menuDesc,
                    theme.typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>
              </View>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.xl },
  menuList: { gap: theme.spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuContent: { flex: 1 },
  menuLabel: { color: theme.colors.textPrimary, marginBottom: 2 },
  menuDesc: {},
});
