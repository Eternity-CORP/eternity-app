import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blur?: boolean; // Enable glassmorphism blur effect
};

export default function Card({ children, style, blur = false }: Props) {
  const { theme, mode } = useTheme();
  
  // Bittensor style - minimal, clean cards
  const cardStyle = {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md, // 8px - minimal radius
    padding: theme.spacing.md,
  };

  // Bittensor doesn't use blur, but keep option for compatibility
  if (blur && Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={40}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[
          styles.card,
          cardStyle,
          {
            borderWidth: 1,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.card,
        cardStyle,
        {
          borderWidth: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Bittensor style - no shadows, clean and flat
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {
        elevation: 0,
      },
      default: {},
    }),
  },
});
