import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AccountTypeBadge } from '@/src/components/AccountTypeBadge';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import type { Account } from '@/src/store/slices/wallet-slice';

interface HomeHeaderProps {
  currentAccount: Account | undefined;
  onOpenAccountSelector: () => void;
}

export function HomeHeader({ currentAccount, onOpenAccountSelector }: HomeHeaderProps) {
  const { theme: dynamicTheme } = useTheme();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}
        onPress={() => router.push('/send/scan')}
      >
        <FontAwesome name="qrcode" size={20} color={dynamicTheme.colors.textPrimary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.accountButton, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}
        onPress={onOpenAccountSelector}
      >
        <Text style={[styles.accountButtonText, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
          {currentAccount?.label || `Account ${(currentAccount?.accountIndex ?? 0) + 1}`}
        </Text>
        {currentAccount?.type && (
          <AccountTypeBadge type={currentAccount.type} size="small" />
        )}
        <FontAwesome name="chevron-down" size={10} color={dynamicTheme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}
        onPress={() => router.push('/(tabs)/transactions')}
      >
        <FontAwesome name="history" size={20} color={dynamicTheme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    maxWidth: 180,
  },
  accountButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
});
