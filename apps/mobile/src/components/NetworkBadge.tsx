/**
 * NetworkBadge Component
 * Displays a network indicator with color and optional icon
 */

import { View, Text, Image, StyleSheet, type ViewStyle, type ImageStyle } from 'react-native';
import { theme } from '@/src/constants/theme';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';

export interface NetworkBadgeProps {
  networkId: NetworkId;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showIcon?: boolean;
  style?: ViewStyle;
}

const SIZES = {
  small: {
    height: 20,
    paddingHorizontal: 6,
    fontSize: 10,
    iconSize: 12,
    dotSize: 6,
  },
  medium: {
    height: 24,
    paddingHorizontal: 8,
    fontSize: 12,
    iconSize: 16,
    dotSize: 8,
  },
  large: {
    height: 32,
    paddingHorizontal: 12,
    fontSize: 14,
    iconSize: 20,
    dotSize: 10,
  },
};

export function NetworkBadge({
  networkId,
  size = 'small',
  showName = true,
  showIcon = false,
  style,
}: NetworkBadgeProps) {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) return null;

  const sizeConfig = SIZES[size];

  return (
    <View
      style={[
        styles.container,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderColor: network.color,
        },
        style,
      ]}
    >
      {showIcon ? (
        <Image
          source={{ uri: network.iconUrl }}
          style={[
            styles.icon,
            {
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.dot,
            {
              width: sizeConfig.dotSize,
              height: sizeConfig.dotSize,
              backgroundColor: network.color,
            },
          ]}
        />
      )}
      {showName && (
        <Text
          style={[
            styles.name,
            {
              fontSize: sizeConfig.fontSize,
            },
          ]}
          numberOfLines={1}
        >
          {network.shortName}
        </Text>
      )}
    </View>
  );
}

/**
 * Compact network dot indicator (just the colored dot)
 */
export function NetworkDot({
  networkId,
  size = 8,
  style,
}: {
  networkId: NetworkId;
  size?: number;
  style?: ViewStyle;
}) {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) return null;

  return (
    <View
      style={[
        styles.dotOnly,
        {
          width: size,
          height: size,
          backgroundColor: network.color,
        },
        style,
      ]}
    />
  );
}

/**
 * Network icon only
 */
export function NetworkIcon({
  networkId,
  size = 20,
  style,
}: {
  networkId: NetworkId;
  size?: number;
  style?: ImageStyle;
}) {
  const network = SUPPORTED_NETWORKS[networkId];
  if (!network) return null;

  return (
    <Image
      source={{ uri: network.iconUrl }}
      style={[
        styles.iconOnly,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  dot: {
    borderRadius: 999,
  },
  dotOnly: {
    borderRadius: 999,
  },
  icon: {
    borderRadius: 4,
  },
  iconOnly: {
    backgroundColor: theme.colors.surface,
  },
  name: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
