/**
 * ConsolidationBanner Component
 * Shows when amount requires collecting from multiple networks
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { formatUsd } from '@e-y/shared';
import { theme } from '@/src/constants/theme';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import { NetworkDot } from '@/src/components/NetworkBadge';

export interface Source {
  network: NetworkId;
  amount: string;
}

export interface ConsolidationBannerProps {
  sources: Source[];
  token: string;
  estimatedFee: number;
  onCollectFromBoth: () => void;
  onSendMax: (maxAmount: string, network: NetworkId) => void;
}

/**
 * Get network display name
 */
function getNetworkName(networkId: NetworkId): string {
  return SUPPORTED_NETWORKS[networkId]?.name || networkId;
}

/**
 * Format amount for display
 */
function formatAmount(amount: string): string {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return amount;
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function ConsolidationBanner({
  sources,
  token,
  estimatedFee,
  onCollectFromBoth,
  onSendMax,
}: ConsolidationBannerProps) {
  // Find the network with highest balance for "Send max" option
  const maxSource = useMemo(() => {
    if (sources.length === 0) return null;
    return sources.reduce((max, current) => {
      const currentAmount = parseFloat(current.amount) || 0;
      const maxAmount = parseFloat(max.amount) || 0;
      return currentAmount > maxAmount ? current : max;
    });
  }, [sources]);

  const handleSendMax = useCallback(() => {
    if (maxSource) {
      onSendMax(maxSource.amount, maxSource.network);
    }
  }, [maxSource, onSendMax]);

  if (sources.length < 2 || !maxSource) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with warning icon */}
      <View style={styles.header}>
        <FontAwesome
          name="exclamation-circle"
          size={16}
          color={theme.colors.warning}
          style={styles.headerIcon}
        />
        <Text style={styles.headerText}>
          Your {token} is on different networks
        </Text>
      </View>

      {/* Balance breakdown per network */}
      <View style={styles.balanceSection}>
        {sources.map((source) => (
          <View key={source.network} style={styles.balanceRow}>
            <NetworkDot networkId={source.network} size={8} />
            <Text style={styles.balanceText}>
              {formatAmount(source.amount)} on{' '}
              <Text style={styles.networkName}>
                {getNetworkName(source.network)}
              </Text>
            </Text>
          </View>
        ))}
      </View>

      {/* Options section */}
      <View style={styles.optionsSection}>
        {/* Option 1: Collect from both */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={onCollectFromBoth}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.radioFilled}>
              <View style={styles.radioInner} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Collect from both</Text>
              <Text style={styles.optionSubtitle}>
                ~{formatUsd(estimatedFee)} fee
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 2: Send max from one network */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleSendMax}
          activeOpacity={0.7}
        >
          <View style={styles.optionRow}>
            <View style={styles.radioEmpty} />
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Send {formatAmount(maxSource.amount)} (max from one network)
              </Text>
              <Text style={styles.optionSubtitleSuccess}>
                No conversion fee
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: theme.spacing.sm,
  },
  headerText: {
    ...theme.typography.body,
    color: theme.colors.warning,
    fontWeight: '600',
    flex: 1,
  },

  // Balance section
  balanceSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  balanceText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  networkName: {
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },

  // Options section
  optionsSection: {
    gap: theme.spacing.sm,
  },
  optionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },

  // Radio buttons
  radioFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
  },

  // Option content
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  optionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  optionSubtitleSuccess: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginTop: 2,
  },
});
