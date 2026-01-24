/**
 * AiFab Component
 * Floating action button for quick AI access from any screen
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from '@/src/store/hooks';
import { theme } from '@/src/constants/theme';

interface AiFabProps {
  /** Custom bottom offset (default: 100) */
  bottomOffset?: number;
}

export function AiFab({ bottomOffset = 80 }: AiFabProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const suggestions = useAppSelector((state) => state.ai.suggestions);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Don't show FAB on AI screen
  if (pathname === '/ai' || pathname === '/(tabs)/ai') {
    return null;
  }

  // Calculate bottom position: base offset + tab bar height + safe area
  const tabBarHeight = 50; // Approximate tab bar content height
  const actualBottom = bottomOffset + Math.max(insets.bottom, 0);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/ai' as any);
  };

  const badgeCount = suggestions.length;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: actualBottom, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <FontAwesome name="magic" size={24} color="#FFFFFF" />
        </LinearGradient>

        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
});
