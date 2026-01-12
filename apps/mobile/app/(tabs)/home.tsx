import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function HomeScreen() {
  const { address } = useAppSelector((state) => state.wallet);
  const totalBalance = '$0.00'; // TODO: Calculate from token balances

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balance, theme.typography.displayLarge]}>
          {totalBalance}
        </Text>
        <Text style={[styles.balanceLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Total Balance
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.buttonPrimaryText }]}>
            Buy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>
            Send
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonIcon]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <FontAwesome name="ellipsis-h" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Token Cards Section */}
      <View style={styles.tokensSection}>
        {/* Large Token Card (Primary) */}
        <View style={styles.tokenCardLarge}>
          <View style={styles.tokenCardHeader}>
            <View style={styles.tokenIcon}>
              <Text style={[styles.tokenIconText, theme.typography.heading]}>ETH</Text>
            </View>
            <View style={styles.tokenInfo}>
              <Text style={[styles.tokenName, theme.typography.heading]}>Ethereum</Text>
              <Text style={[styles.tokenTicker, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                ETH
              </Text>
            </View>
          </View>
          <View style={styles.tokenCardBody}>
            <Text style={[styles.tokenBalance, theme.typography.title]}>0.00 ETH</Text>
            <Text style={[styles.tokenValue, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              $0.00
            </Text>
          </View>
        </View>

        {/* Token Grid (2 columns) */}
        <View style={styles.tokenGrid}>
          {/* Placeholder for future tokens */}
          <View style={styles.tokenCardSmall}>
            <View style={styles.tokenCardHeader}>
              <View style={[styles.tokenIcon, styles.tokenIconSmall]}>
                <Text style={[styles.tokenIconTextSmall, theme.typography.caption]}>?</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, theme.typography.body]}>No tokens</Text>
              </View>
            </View>
            <Text style={[styles.tokenBalanceSmall, theme.typography.body]}>—</Text>
          </View>
        </View>
      </View>

      {/* Address Display (for debugging) */}
      {address && (
        <View style={styles.addressSection}>
          <Text style={[styles.addressLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Wallet Address
          </Text>
          <Text style={[styles.addressText, theme.typography.caption, { color: theme.colors.textTertiary }]}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </Text>
        </View>
      )}
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
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  balance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  actionButtonIcon: {
    backgroundColor: theme.colors.surface,
    flex: 0,
    width: 56,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.full,
  },
  actionButtonText: {
    ...theme.typography.heading,
  },
  tokensSection: {
    gap: theme.spacing.lg,
  },
  tokenCardLarge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  tokenIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  tokenIconSmall: {
    width: 32,
    height: 32,
  },
  tokenIconText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  tokenIconTextSmall: {
    color: theme.colors.textSecondary,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tokenTicker: {
    textTransform: 'uppercase',
  },
  tokenCardBody: {
    alignItems: 'flex-start',
  },
  tokenBalance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tokenValue: {
    // Already styled
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tokenCardSmall: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '48%',
  },
  tokenBalanceSmall: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  addressSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
    alignItems: 'center',
  },
  addressLabel: {
    marginBottom: theme.spacing.xs,
  },
  addressText: {
    fontFamily: 'monospace',
  },
});
