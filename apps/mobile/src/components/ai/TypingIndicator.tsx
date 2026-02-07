/**
 * TypingIndicator Component
 * Animated typing dots for streaming AI response
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { aiChat } from '@/src/constants/ai-chat-theme';
import { theme } from '@/src/constants/theme';
import { renderMarkdown } from '@/src/utils/markdown';

interface TypingIndicatorProps {
  streamingContent?: string;
}

export function TypingIndicator({ streamingContent }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createAnimation(dot1, 0);
    const animation2 = createAnimation(dot2, 150);
    const animation3 = createAnimation(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  const createDotStyle = (animValue: Animated.Value) => ({
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {streamingContent ? (
          <Text style={styles.streamingText}>{renderMarkdown(streamingContent, styles.streamingText)}</Text>
        ) : (
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, createDotStyle(dot1)]} />
            <Animated.View style={[styles.dot, createDotStyle(dot2)]} />
            <Animated.View style={[styles.dot, createDotStyle(dot3)]} />
          </View>
        )}
      </View>
      <Text style={styles.label}>
        {streamingContent ? 'AI is responding...' : 'AI is thinking...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  bubble: {
    backgroundColor: aiChat.aiBubble.bg,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: aiChat.aiBubble.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minWidth: 60,
    maxWidth: '85%',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    height: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: aiChat.text.tertiary,
  },
  streamingText: {
    fontSize: 14,
    color: aiChat.text.primary,
    lineHeight: 20,
  },
  label: {
    fontSize: 10,
    color: 'rgba(51,136,255,0.6)',
    marginTop: theme.spacing.xs,
  },
});
