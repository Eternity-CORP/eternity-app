/**
 * BridgeCostBanner Component
 * Shows bridge/conversion costs in send flow when sending across networks
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import {
  BridgeQuote,
  formatBridgeTime,
  BridgeCostLevel,
} from '@/src/services/bridge-service';
import { NetworkDot } from '@/src/components/NetworkBadge';

export interface BridgeCostBannerProps {
  recipientName?: string;
  recipientNetwork: NetworkId;
  senderNetwork: NetworkId;
  bridgeQuote: BridgeQuote;
  costLevel: BridgeCostLevel;
  onSendWithoutBridge?: () => void;
  alternativeNetwork?: NetworkId;
}

/**
 * Format USD value for display
 */
function formatUsd(value: number): string {
  if (value < 0.01 && value > 0) {
    return '<$0.01';
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Get network display name
 */
function getNetworkName(networkId: NetworkId): string {
  return SUPPORTED_NETWORKS[networkId]?.name || networkId;
}

export function BridgeCostBanner({
  recipientName,
  recipientNetwork,
  senderNetwork,
  bridgeQuote,
  costLevel,
  onSendWithoutBridge,
  alternativeNetwork,
}: BridgeCostBannerProps) {
  const hasWarning = costLevel === 'warning' || costLevel === 'expensive';
  const recipientLabel = recipientName || 'Recipient';

  return (
    <View
      style={[
        styles.container,
        hasWarning && styles.containerWarning,
      ]}
    >
      {/* Recipient preference info */}
      <View style={styles.row}>
        <FontAwesome
          name="star"
          size={14}
          color={theme.colors.warning}
          style={styles.icon}
        />
        <Text style={styles.text}>
          {recipientLabel} receives on{' '}
          <Text style={styles.networkText}>
            {getNetworkName(recipientNetwork)}
          </Text>
        </Text>
        <NetworkDot networkId={recipientNetwork} size={8} style={styles.networkDot} />
      </View>

      {/* Conversion info box */}
      <View style={styles.conversionBox}>
        <View style={styles.conversionRow}>
          <Text style={styles.conversionLabel}>
            Your {bridgeQuote.fromToken} is on
          </Text>
          <View style={styles.networkBadge}>
            <NetworkDot networkId={senderNetwork} size={6} />
            <Text style={styles.networkBadgeText}>
              {getNetworkName(senderNetwork)}
            </Text>
          </View>
        </View>
        <View style={styles.conversionArrow}>
          <FontAwesome
            name="exchange"
            size={12}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.conversionSummary}>
            Conversion: ~{formatUsd(bridgeQuote.totalFeeUsd)}, {formatBridgeTime(bridgeQuote.estimatedTime)}
          </Text>
        </View>
      </View>

      {/* Fee breakdown */}
      <View style={styles.feeSection}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Network fee</Text>
          <Text style={styles.feeValue}>~{formatUsd(bridgeQuote.estimatedGasUsd)}</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Conversion fee</Text>
          <Text style={styles.feeValue}>~{formatUsd(bridgeQuote.bridgeFeeUsd)}</Text>
        </View>
        <View style={[styles.feeRow, styles.feeTotalRow]}>
          <Text style={styles.feeTotalLabel}>Total fees</Text>
          <Text
            style={[
              styles.feeTotalValue,
              hasWarning && styles.feeTotalValueWarning,
            ]}
          >
            ~{formatUsd(bridgeQuote.totalFeeUsd)}
          </Text>
        </View>
      </View>

      {/* Alternative option button */}
      {alternativeNetwork && onSendWithoutBridge && (
        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={onSendWithoutBridge}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="lightbulb-o"
            size={14}
            color={theme.colors.accent}
            style={styles.alternativeIcon}
          />
          <Text style={styles.alternativeText}>
            Or send to{' '}
            <Text style={styles.alternativeNetworkText}>
              {getNetworkName(alternativeNetwork)}
            </Text>
            {' '}without conversion fees
          </Text>
        </TouchableOpacity>
      )}

      {/* Warning banner for expensive bridges */}
      {costLevel === 'expensive' && (
        <View style={styles.warningBanner}>
          <FontAwesome
            name="exclamation-triangle"
            size={14}
            color={theme.colors.warning}
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            Conversion fee is high relative to amount. Consider the alternative.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  containerWarning: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },

  // Recipient info row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  networkText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  networkDot: {
    marginLeft: theme.spacing.xs,
  },

  // Conversion box
  conversionBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  networkBadgeText: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
  conversionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  conversionSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  // Fee section
  feeSection: {
    gap: theme.spacing.xs,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  feeValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  feeTotalRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  feeTotalLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  feeTotalValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  feeTotalValueWarning: {
    color: theme.colors.warning,
  },

  // Alternative button
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  alternativeIcon: {
    marginRight: theme.spacing.sm,
  },
  alternativeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  alternativeNetworkText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },

  // Warning banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  warningIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    flex: 1,
  },
});
