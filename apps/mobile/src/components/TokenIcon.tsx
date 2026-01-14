/**
 * Shared TokenIcon Component
 * Displays a token icon with image fallback to symbol initials
 */

import { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle, type ImageStyle } from 'react-native';
import { theme } from '@/src/constants/theme';

export interface TokenIconProps {
  symbol: string;
  iconUrl?: string | null;
  size?: number;
  style?: ViewStyle | ImageStyle;
}

export function TokenIcon({ symbol, iconUrl, size = 40, style }: TokenIconProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const showFallback = hasError || !iconUrl;
  const initials = symbol.slice(0, size >= 48 ? 3 : 2).toUpperCase();
  const borderRadius = size / 4;

  if (showFallback) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.fallbackText,
            {
              fontSize: size >= 48 ? 14 : size >= 32 ? 12 : 10,
            },
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: iconUrl }}
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style as ImageStyle,
      ]}
      onError={handleError}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  image: {
    backgroundColor: theme.colors.surface,
  },
});
