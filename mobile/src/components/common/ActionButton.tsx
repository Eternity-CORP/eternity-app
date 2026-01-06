/**
 * ActionButton - Minimal action button for quick actions (Send, Receive, Swap, etc.)
 * Style inspired by Bittensor - clean and minimal
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

  // Bittensor style - smaller, more minimal buttons
  const sizeConfig = {
    small: { container: 44, icon: 20, labelSize: 10 },
    medium: { container: 52, icon: 24, labelSize: 11 },
    large: { container: 60, icon: 28, labelSize: 12 },
  };

  const config = sizeConfig[size];
  const iconColor = color || theme.colors.text;
  const bgColor = backgroundColor || theme.colors.surface;

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
    minWidth: 64,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    // Bittensor style - no shadows
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  label: {
    textAlign: 'center',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
