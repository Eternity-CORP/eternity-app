/**
 * Profile Screen (Shard Tab)
 * User profile with SHARD identity and settings access
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, clearWallet as clearWalletAction } from '@/src/store/slices/wallet-slice';
import { clearWallet } from '@/src/services/wallet-service';
import { truncateAddress } from '@/src/utils/format';
import { AccountTypeBadge } from '@/src/components/AccountTypeBadge';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function ProfileScreen() {
  const { theme: dynamicTheme, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);

  const handleSettingsPress = () => {
    router.push('/profile/settings');
  };

  const handleUsernamePress = () => {
    router.push('/profile/username');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your wallet and all data from this device. Make sure you have backed up your seed phrase. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'All wallet data, accounts, and settings will be permanently erased.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    await clearWallet();
                    dispatch(clearWalletAction());
                    router.replace('/(onboarding)/welcome');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header with Settings */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: dynamicTheme.colors.textPrimary }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: dynamicTheme.colors.surface }]}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <FontAwesome name="cog" size={22} color={dynamicTheme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Account Card */}
        <View style={[styles.accountCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['#FFFFFF', '#CCCCCC'] : ['#333333', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <FontAwesome name="user" size={32} color={isDark ? '#000000' : '#FFFFFF'} />
          </LinearGradient>

          <View style={styles.accountInfo}>
            <View style={styles.accountNameRow}>
              <Text style={[styles.accountName, { color: dynamicTheme.colors.textPrimary }]}>
                {currentAccount?.label || `Account ${(currentAccount?.accountIndex ?? 0) + 1}`}
              </Text>
              {currentAccount && (
                <AccountTypeBadge type={currentAccount.type} size="small" />
              )}
            </View>
            <Text style={[styles.accountAddress, { color: dynamicTheme.colors.textTertiary }]}>
              {currentAccount ? truncateAddress(currentAccount.address) : ''}
            </Text>
          </View>
        </View>

        {/* SHARD Identity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textSecondary }]}>SHARD Identity</Text>

          <View style={[styles.shardCard, { borderColor: dynamicTheme.colors.border }]}>
            <LinearGradient
              colors={isDark ? ['#1A1A1A', '#0A0A0A'] : ['#FFFFFF', '#F0F0F0']}
              style={styles.shardCardGradient}
            >
              <View style={styles.shardRow}>
                <View style={[styles.shardIconContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
                  <FontAwesome name="at" size={18} color={dynamicTheme.colors.accent} />
                </View>
                <View style={styles.shardInfo}>
                  <Text style={[styles.shardLabel, { color: dynamicTheme.colors.textSecondary }]}>Username</Text>
                  <TouchableOpacity onPress={handleUsernamePress}>
                    <Text style={[styles.shardValueLink, { color: dynamicTheme.colors.accent }]}>Set username →</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: dynamicTheme.colors.border }]} />

              <View style={styles.shardRow}>
                <View style={[styles.shardIconContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
                  <FontAwesome name="star" size={18} color="#F59E0B" />
                </View>
                <View style={styles.shardInfo}>
                  <Text style={[styles.shardLabel, { color: dynamicTheme.colors.textSecondary }]}>Reputation Points</Text>
                  <Text style={[styles.shardValue, { color: dynamicTheme.colors.textPrimary }]}>0 points</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: dynamicTheme.colors.border }]} />

              <View style={styles.shardRow}>
                <View style={[styles.shardIconContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
                  <FontAwesome name="trophy" size={18} color="#10B981" />
                </View>
                <View style={styles.shardInfo}>
                  <Text style={[styles.shardLabel, { color: dynamicTheme.colors.textSecondary }]}>Achievements</Text>
                  <Text style={[styles.shardValue, { color: dynamicTheme.colors.textPrimary }]}>0 badges</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.comingSoonBadge}>
            <FontAwesome name="clock-o" size={12} color={dynamicTheme.colors.textTertiary} />
            <Text style={[styles.comingSoonText, { color: dynamicTheme.colors.textTertiary }]}>Full SHARD features coming soon</Text>
          </View>
        </View>

        {/* Quick Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textSecondary }]}>Quick Settings</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: dynamicTheme.colors.surface }]}
            onPress={() => router.push('/settings/networks')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: dynamicTheme.colors.background }]}>
              <FontAwesome name="globe" size={18} color={dynamicTheme.colors.accent} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: dynamicTheme.colors.textPrimary }]}>Network Preferences</Text>
              <Text style={[styles.menuDesc, { color: dynamicTheme.colors.textSecondary }]}>Configure receiving networks</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={dynamicTheme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: dynamicTheme.colors.surface }]}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: dynamicTheme.colors.background }]}>
              <FontAwesome name="cog" size={18} color={dynamicTheme.colors.textSecondary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: dynamicTheme.colors.textPrimary }]}>All Settings</Text>
              <Text style={[styles.menuDesc, { color: dynamicTheme.colors.textSecondary }]}>Privacy, security, and more</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={dynamicTheme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: dynamicTheme.colors.surface, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <FontAwesome name="trash" size={18} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: '#EF4444' }]}>Delete Account</Text>
              <Text style={[styles.menuDesc, { color: dynamicTheme.colors.textSecondary }]}>Remove all wallet data from device</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  accountName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  accountAddress: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  shardCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shardCardGradient: {
    padding: theme.spacing.lg,
  },
  shardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  shardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shardInfo: {
    flex: 1,
  },
  shardLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  shardValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  shardValueLink: {
    ...theme.typography.body,
    color: theme.colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  comingSoonText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  menuDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
