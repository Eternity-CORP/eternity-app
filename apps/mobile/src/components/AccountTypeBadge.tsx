/**
 * AccountTypeBadge Component
 * Displays a badge indicating TEST or REAL account type
 */

import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/src/constants/theme';

export interface AccountTypeBadgeProps {
  type: 'test' | 'real' | 'business';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

const SIZES = {
  small: {
    height: 20,
    paddingHorizontal: 8,
    fontSize: 10,
  },
  medium: {
    height: 26,
    paddingHorizontal: 10,
    fontSize: 12,
  },
};

const COLORS = {
  test: {
    background: 'rgba(245, 158, 11, 0.15)', // Orange/amber transparent
    text: '#F59E0B',
  },
  real: {
    background: 'rgba(34, 197, 94, 0.15)', // Green transparent
    text: '#22C55E',
  },
  business: {
    background: 'rgba(51, 136, 255, 0.15)', // Blue transparent
    text: '#3388FF',
  },
};

export function AccountTypeBadge({
  type,
  size = 'small',
  style,
}: AccountTypeBadgeProps) {
  const sizeConfig = SIZES[size];
  const colorConfig = COLORS[type];
  const label = type === 'test' ? 'TEST' : type === 'business' ? 'BIZ' : 'REAL';

  return (
    <View
      style={[
        styles.container,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          backgroundColor: colorConfig.background,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeConfig.fontSize,
            color: colorConfig.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
