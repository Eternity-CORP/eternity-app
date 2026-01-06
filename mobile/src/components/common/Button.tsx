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

  // Bittensor style: primary is contrast color, secondary is muted
  const bgColor =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'secondary'
      ? theme.colors.surface
      : 'transparent';

  const borderColor = variant === 'outline' ? theme.colors.border : 'transparent';
  // Text color depends on variant and theme
  const textColor = 
    variant === 'primary' 
      ? theme.colors.background  // Inverted for contrast
      : variant === 'secondary'
      ? theme.colors.text
      : theme.colors.text;
  
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
    borderRadius: 8, // Bittensor style - minimal radius
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
    // Minimal shadow
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.01,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
