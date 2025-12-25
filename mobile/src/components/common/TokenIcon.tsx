/**
 * TokenIcon Component
 * 
 * Displays token logos with high-quality fallbacks and proper sizing
 * Handles loading errors gracefully with fallback placeholder
 */
import React, { useState } from 'react';
import { View, Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TokenIconProps {
  uri?: string;
  symbol?: string;
  size?: number;
  style?: ViewStyle | ImageStyle;
}

export default function TokenIcon({ uri, symbol, size = 40, style }: TokenIconProps) {
  const { theme } = useTheme();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fallback to first letter if no symbol
  const fallbackText = symbol ? symbol.charAt(0).toUpperCase() : '?';

  // If error loading image, show fallback
  if (error || !uri) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primary + '20',
          },
          style,
        ]}
      >
        <Ionicons
          name="logo-usd"
          size={size * 0.6}
          color={theme.colors.primary}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
          },
        ]}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
        resizeMode="cover"
      />
      {loading && (
        <View
          style={[
            styles.loadingOverlay,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Ionicons
            name="logo-usd"
            size={size * 0.4}
            color={theme.colors.textSecondary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    // Soft shadow
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    // Ensures proper image rendering
  },
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

