/**
 * ActionButton - Circular action button for quick actions (Send, Receive, Swap, etc.)
 * Style inspired by Phantom/Trust Wallet
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActionButton({
  icon,
  label,
  onPress,
  color,
  backgroundColor,
  size = 'medium',
  disabled = false,
  style,
}: Props) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const sizeConfig = {
    small: { container: 48, icon: 22, labelSize: 11 },
    medium: { container: 56, icon: 26, labelSize: 12 },
    large: { container: 64, icon: 30, labelSize: 13 },
  };

  const config = sizeConfig[size];
  const iconColor = color || theme.colors.primary;
  const bgColor = backgroundColor || `${theme.colors.primary}15`;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    if (disabled) return;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics not available
    }
    
    onPress();
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
            backgroundColor: bgColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={config.icon} color={iconColor} />
      </Animated.View>
      <Text
        style={[
          styles.label,
          {
            color: disabled ? theme.colors.muted : theme.colors.text,
            fontSize: config.labelSize,
            fontFamily: theme.typography.fontFamilies.medium,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 72,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    // Soft shadow for depth
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    textAlign: 'center',
    fontWeight: '500',
  },
});
