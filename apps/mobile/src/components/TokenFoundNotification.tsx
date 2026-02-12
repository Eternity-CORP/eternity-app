/**
 * Token Found Notification Component
 * Shows alert when tokens are found on Tier 2 networks
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { type Tier2TokenBalance } from '@/src/services/smart-scanning-service';
import {
  getSuggestedBridgeDestination,
  getBridgeDestinationInfo,
} from '@/src/services/smart-scanning-service';

interface TokenFoundNotificationProps {
  balance: Tier2TokenBalance;
  onBridge: (balance: Tier2TokenBalance, destinationNetwork: string) => void;
  onDismiss: (networkId: string, tokenSymbol: string) => void;
  onSnooze: (networkId: string, tokenSymbol: string) => void;
}

export function TokenFoundNotification({
  balance,
  onBridge,
  onDismiss,
  onSnooze,
}: TokenFoundNotificationProps) {
  const suggestedNetwork = getSuggestedBridgeDestination(balance.tokenSymbol);
  const destinationInfo = getBridgeDestinationInfo(suggestedNetwork);

  return (
    <View style={styles.container}>
      {/* Header with icon and network info */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <FontAwesome name="lightbulb-o" size={20} color={theme.colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, theme.typography.body]}>
            Tokens found on {balance.networkName}
          </Text>
          <Text style={[styles.subtitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {balance.balanceFormatted}
            {balance.estimatedUsdValue > 0 && ` (~$${balance.estimatedUsdValue.toFixed(2)})`}
          </Text>
        </View>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => onDismiss(balance.networkId, balance.tokenSymbol)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="times" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Network badge */}
      <View style={[styles.networkBadge, { backgroundColor: balance.networkColor + '20' }]}>
        <View style={[styles.networkDot, { backgroundColor: balance.networkColor }]} />
        <Text style={[styles.networkName, { color: balance.networkColor }]}>
          {balance.networkName}
        </Text>
        <FontAwesome name="arrow-right" size={12} color={theme.colors.textTertiary} style={styles.arrow} />
        <View style={[styles.networkDot, { backgroundColor: destinationInfo.color }]} />
        <Text style={[styles.networkName, { color: destinationInfo.color }]}>
          {destinationInfo.name}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.bridgeButton}
          onPress={() => onBridge(balance, suggestedNetwork)}
        >
          <FontAwesome name="exchange" size={14} color={theme.colors.buttonPrimaryText} />
          <Text style={[styles.bridgeButtonText, theme.typography.body]}>
            Move to {destinationInfo.name}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.laterButton}
          onPress={() => onSnooze(balance.networkId, balance.tokenSymbol)}
        >
          <Text style={[styles.laterButtonText, theme.typography.body]}>
            Later
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Compact version for multiple alerts
 */
interface TokenFoundBadgeProps {
  count: number;
  totalUsdValue: number;
  onPress: () => void;
}

export function TokenFoundBadge({ count, totalUsdValue, onPress }: TokenFoundBadgeProps) {
  return (
    <TouchableOpacity style={styles.badge} onPress={onPress}>
      <FontAwesome name="lightbulb-o" size={16} color={theme.colors.warning} />
      <Text style={[styles.badgeText, theme.typography.caption]}>
        {count} token{count > 1 ? 's' : ''} found on other networks
        {totalUsdValue > 0 && ` (~$${totalUsdValue.toFixed(0)})`}
      </Text>
      <FontAwesome name="chevron-right" size={12} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: theme.spacing.xs / 2,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  networkName: {
    fontSize: 13,
    fontWeight: '500',
  },
  arrow: {
    marginHorizontal: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  bridgeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
  },
  bridgeButtonText: {
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  laterButtonText: {
    color: theme.colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  badgeText: {
    flex: 1,
    color: theme.colors.textPrimary,
  },
});
