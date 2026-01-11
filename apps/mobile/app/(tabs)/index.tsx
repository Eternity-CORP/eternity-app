import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton}>
            <View style={styles.scanIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <View style={styles.historyIcon} />
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <Text style={styles.balance}>$0.00</Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionPrimary}>
            <Text style={styles.actionPrimaryText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSecondary}>
            <Text style={styles.actionSecondaryText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Token Card - Main */}
        <View style={styles.tokenCardLarge}>
          <View style={styles.tokenHeader}>
            <View style={styles.tokenIcon} />
            <View style={styles.chartPlaceholder} />
          </View>
          <Text style={styles.tokenName}>Ethereum</Text>
          <View style={styles.tokenBalanceRow}>
            <Text style={styles.tokenBalance}>$0.00</Text>
            <Text style={styles.tokenChange}>0.00%</Text>
          </View>
        </View>

        {/* Token Grid */}
        <View style={styles.tokenGrid}>
          <View style={styles.tokenCardSmall}>
            <View style={[styles.tokenIconSmall, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.tokenNameSmall}>USDC</Text>
            <Text style={styles.tokenBalanceSmall}>$0.00</Text>
          </View>
          <View style={styles.tokenCardSmall}>
            <View style={[styles.tokenIconSmall, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.tokenNameSmall}>USDT</Text>
            <Text style={styles.tokenBalanceSmall}>$0.00</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  historyIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderRadius: 10,
  },
  balance: {
    ...typography.displayLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  actionPrimary: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  actionPrimaryText: {
    color: colors.buttonPrimaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSecondary: {
    backgroundColor: colors.buttonSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBorder,
  },
  actionSecondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  actionIcon: {
    backgroundColor: colors.buttonSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBorder,
  },
  moreIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenCardLarge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textSecondary,
  },
  chartPlaceholder: {
    width: 100,
    height: 40,
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  tokenName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tokenBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenBalance: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  tokenChange: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tokenGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tokenCardSmall: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  tokenIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  tokenNameSmall: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tokenBalanceSmall: {
    ...typography.heading,
    color: colors.textPrimary,
  },
});
