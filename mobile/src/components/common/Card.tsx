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
  
  const cardStyle = {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg, // 20px for TON Wallet style
    padding: theme.spacing.md, // 16px
  };

  // Glassmorphism effect for TON Wallet/Telegram style
  if (blur && Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
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
          shadowColor: '#000',
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
    ...Platform.select({
      ios: {
        // Soft, airy shadows like TON Wallet
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 3, // Lower elevation for softer look
      },
      default: {},
    }),
  },
});
