/**
 * Profile Settings Screen
 * Menu linking to various settings screens + theme toggle
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme, type ThemeMode } from '@/src/contexts';
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

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }[] = [
  { mode: 'light', label: 'Light', icon: 'sun-o' },
  { mode: 'dark', label: 'Dark', icon: 'moon-o' },
  { mode: 'system', label: 'System', icon: 'mobile' },
];

export default function ProfileSettingsScreen() {
  const { theme: dynamicTheme, themeMode, setThemeMode } = useTheme();

  const handleMenuPress = (route: string) => {
    router.push(route as never);
  };

  const handleThemeChange = () => {
    // Cycle through: light -> dark -> system -> light
    const currentIndex = THEME_OPTIONS.findIndex(opt => opt.mode === themeMode);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    setThemeMode(THEME_OPTIONS[nextIndex].mode);
  };

  const currentThemeOption = THEME_OPTIONS.find(opt => opt.mode === themeMode) || THEME_OPTIONS[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Settings" />

      <View style={styles.container}>
        {/* Theme Toggle */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            APPEARANCE
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: dynamicTheme.colors.surface }]}
          onPress={handleThemeChange}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: dynamicTheme.colors.surfaceElevated }]}>
            <FontAwesome
              name={currentThemeOption.icon}
              size={20}
              color={dynamicTheme.colors.accent}
            />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuLabel, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              Theme
            </Text>
            <Text
              style={[
                styles.menuDesc,
                theme.typography.caption,
                { color: dynamicTheme.colors.textSecondary },
              ]}
            >
              Currently: {currentThemeOption.label}
            </Text>
          </View>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((option) => (
              <View
                key={option.mode}
                style={[
                  styles.themeOptionDot,
                  { backgroundColor: dynamicTheme.colors.border },
                  option.mode === themeMode && { backgroundColor: dynamicTheme.colors.accent },
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* Other Settings */}
        <View style={[styles.sectionHeader, { marginTop: theme.spacing.xl }]}>
          <Text style={[theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            PREFERENCES
          </Text>
        </View>
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: dynamicTheme.colors.surfaceElevated }]}>
                <FontAwesome
                  name={item.icon}
                  size={20}
                  color={dynamicTheme.colors.accent}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.menuDesc,
                    theme.typography.caption,
                    { color: dynamicTheme.colors.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>
              </View>
              <FontAwesome
                name="chevron-right"
                size={14}
                color={dynamicTheme.colors.textTertiary}
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
  sectionHeader: {
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  menuList: { gap: theme.spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
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
  themeOptions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  themeOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  themeOptionDotActive: {
    backgroundColor: theme.colors.accent,
  },
});
