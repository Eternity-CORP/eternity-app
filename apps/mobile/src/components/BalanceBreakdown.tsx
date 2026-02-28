/**
 * BalanceBreakdown Component
 * Shows token balance with expandable per-network breakdown
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { NetworkId, getNetworkConfig } from '@/src/constants/networks';
import { NetworkBadge, NetworkDot } from './NetworkBadge';
import { TokenIcon } from './TokenIcon';
import { formatUsd } from '@e-y/shared';

export interface NetworkBalance {
  networkId: NetworkId;
  balance: string;
  usdValue: number;
}

export interface BalanceBreakdownProps {
  symbol: string;
  name: string;
  totalBalance: string;
  totalUsdValue: number;
  networks: NetworkBalance[];
  iconUrl?: string;
  style?: ViewStyle;
  // Callback when a specific network is tapped
  onNetworkPress?: (networkId: NetworkId) => void;
}

const ANIMATION_DURATION = 250;
const ITEM_HEIGHT = 44;

export function BalanceBreakdown({
  symbol,
  name,
  totalBalance,
  totalUsdValue,
  networks,
  iconUrl,
  style,
  onNetworkPress,
}: BalanceBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  // Only show expand if there are multiple networks
  const canExpand = networks.length > 1;
  const expandedHeight = networks.length * ITEM_HEIGHT;

  const toggleExpand = useCallback(() => {
    if (!canExpand) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    expandProgress.value = withTiming(newExpanded ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [canExpand, isExpanded, expandProgress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      expandProgress.value,
      [0, 1],
      [0, expandedHeight]
    ),
    opacity: expandProgress.value,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  // Format balance for display
  const formattedBalance = parseFloat(totalBalance).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

  return (
    <View style={[styles.container, style]}>
      {/* Main row - always visible */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={toggleExpand}
        activeOpacity={canExpand ? 0.7 : 1}
        disabled={!canExpand}
      >
        <TokenIcon symbol={symbol} iconUrl={iconUrl} size={40} />

        <View style={styles.tokenInfo}>
          <View style={styles.tokenNameRow}>
            <Text style={[styles.tokenName, theme.typography.heading]}>
              {symbol}
            </Text>
            {/* Show network badges inline for single network */}
            {networks.length === 1 && (
              <NetworkBadge
                networkId={networks[0].networkId}
                size="small"
                style={styles.singleNetworkBadge}
              />
            )}
            {/* Show count badge for multiple networks */}
            {networks.length > 1 && (
              <View style={styles.networkCountBadge}>
                <Text style={styles.networkCountText}>
                  {networks.length} networks
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tokenSymbol, theme.typography.caption]}>
            {name || symbol}
          </Text>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, theme.typography.heading]}>
            {formattedBalance}
          </Text>
          <Text style={[styles.usdValue, theme.typography.caption]}>
            {formatUsd(totalUsdValue)}
          </Text>
        </View>

        {canExpand && (
          <Animated.View style={[styles.chevron, chevronAnimatedStyle]}>
            <FontAwesome
              name="chevron-down"
              size={12}
              color={theme.colors.textTertiary}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Expandable network breakdown */}
      {canExpand && (
        <Animated.View style={[styles.networkList, containerAnimatedStyle]}>
          {networks.map((network, index) => (
            <NetworkBalanceRow
              key={network.networkId}
              networkId={network.networkId}
              balance={network.balance}
              usdValue={network.usdValue}
              isLast={index === networks.length - 1}
              onPress={onNetworkPress}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Individual network balance row
 */
function NetworkBalanceRow({
  networkId,
  balance,
  usdValue,
  isLast,
  onPress,
}: {
  networkId: NetworkId;
  balance: string;
  usdValue: number;
  isLast: boolean;
  onPress?: (networkId: NetworkId) => void;
}) {
  const network = getNetworkConfig(networkId);
  const formattedBalance = parseFloat(balance).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

  const handlePress = useCallback(() => {
    onPress?.(networkId);
  }, [networkId, onPress]);

  return (
    <TouchableOpacity
      style={[styles.networkRow, !isLast && styles.networkRowBorder]}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.networkRowLeft}>
        {/* Tree connector */}
        <View style={styles.treeConnector}>
          <View style={[styles.treeLine, !isLast && styles.treeLineExtended]} />
          <View style={styles.treeBranch} />
        </View>

        <NetworkDot networkId={networkId} size={8} style={styles.networkDot} />
        <Text style={[styles.networkName, theme.typography.caption]}>
          {network.name}
        </Text>
      </View>

      <View style={styles.networkRowRight}>
        <Text style={[styles.networkBalance, theme.typography.body]}>
          {formattedBalance}
        </Text>
        <Text style={[styles.networkUsdValue, theme.typography.caption]}>
          {formatUsd(usdValue)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Compact balance display (no expansion, just total)
 */
export function BalanceCompact({
  symbol,
  totalBalance,
  totalUsdValue,
  networks,
  iconUrl,
  style,
}: Omit<BalanceBreakdownProps, 'name' | 'onNetworkPress'> & { name?: string }) {
  const formattedBalance = parseFloat(totalBalance).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });

  return (
    <View style={[styles.compactContainer, style]}>
      <TokenIcon symbol={symbol} iconUrl={iconUrl} size={32} />

      <View style={styles.compactInfo}>
        <Text style={[styles.compactSymbol, theme.typography.body]}>
          {symbol}
        </Text>
        {/* Show network dots */}
        <View style={styles.networkDots}>
          {networks.slice(0, 3).map((n) => (
            <NetworkDot
              key={n.networkId}
              networkId={n.networkId}
              size={6}
              style={styles.compactDot}
            />
          ))}
          {networks.length > 3 && (
            <Text style={styles.moreNetworks}>+{networks.length - 3}</Text>
          )}
        </View>
      </View>

      <View style={styles.compactBalance}>
        <Text style={[styles.compactAmount, theme.typography.body]}>
          {formattedBalance}
        </Text>
        <Text style={[styles.compactUsd, theme.typography.caption]}>
          {formatUsd(totalUsdValue)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tokenName: {
    color: theme.colors.textPrimary,
  },
  tokenSymbol: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  singleNetworkBadge: {
    marginLeft: theme.spacing.xs,
  },
  networkCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  networkCountText: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balance: {
    color: theme.colors.textPrimary,
  },
  usdValue: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },

  // Network list
  networkList: {
    overflow: 'hidden',
    paddingLeft: theme.spacing.lg + 40 + theme.spacing.md, // Align with token info
    paddingRight: theme.spacing.lg,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ITEM_HEIGHT,
    paddingVertical: theme.spacing.sm,
  },
  networkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  networkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  treeConnector: {
    width: 16,
    height: ITEM_HEIGHT,
    position: 'relative',
  },
  treeLine: {
    position: 'absolute',
    left: 3,
    top: 0,
    width: 1,
    height: ITEM_HEIGHT / 2,
    backgroundColor: theme.colors.border,
  },
  treeLineExtended: {
    height: ITEM_HEIGHT,
  },
  treeBranch: {
    position: 'absolute',
    left: 3,
    top: ITEM_HEIGHT / 2,
    width: 10,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  networkDot: {
    marginLeft: 4,
  },
  networkName: {
    color: theme.colors.textSecondary,
  },
  networkRowRight: {
    alignItems: 'flex-end',
  },
  networkBalance: {
    color: theme.colors.textPrimary,
  },
  networkUsdValue: {
    color: theme.colors.textTertiary,
    marginTop: 2,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  compactInfo: {
    flex: 1,
  },
  compactSymbol: {
    color: theme.colors.textPrimary,
  },
  networkDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  compactDot: {},
  moreNetworks: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginLeft: 2,
  },
  compactBalance: {
    alignItems: 'flex-end',
  },
  compactAmount: {
    color: theme.colors.textPrimary,
  },
  compactUsd: {
    color: theme.colors.textSecondary,
  },
});
