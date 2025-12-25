import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

type Props = {
  title?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export default function Button({ title, children, variant = 'primary', onPress, disabled, loading, style }: Props) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'secondary'
      ? theme.colors.secondary
      : 'transparent';

  const borderColor = variant === 'outline' ? theme.colors.border : 'transparent';
  const textColor = variant === 'outline' ? theme.colors.text : '#FFFFFF';
  
  const content = children || title;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bgColor, borderColor },
        pressed && { opacity: 0.95 },
        style,
      ]}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.text, { color: textColor, fontFamily: theme.typography.fontFamilies.medium }]}>
            {content}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20, // More rounded like TON Wallet
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 0, // No border for primary buttons
    minHeight: 52,
    justifyContent: 'center',
    // Soft shadow for depth
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 17,
    fontWeight: '600', // Slightly lighter weight
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
