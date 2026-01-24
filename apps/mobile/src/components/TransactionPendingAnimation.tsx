/**
 * Transaction Pending Animation Component
 * Shows a pulsing/rotating animation while waiting for transaction confirmation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { theme } from '@/src/constants/theme';

interface Props {
  message?: string;
}

export function TransactionPendingAnimation({ message = 'Processing...' }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.outerCircle,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.innerCircle,
            { transform: [{ rotate }] },
          ]}
        >
          <View style={styles.dot} />
        </Animated.View>
      </Animated.View>
      <Text style={[styles.message, theme.typography.body, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  outerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: theme.colors.accent,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  message: {
    textAlign: 'center',
  },
});
