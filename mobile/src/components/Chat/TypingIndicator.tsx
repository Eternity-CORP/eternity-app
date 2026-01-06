import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

export const TypingIndicator: React.FC = () => {
  const { theme } = useTheme();
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    const duration = 400;

    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration }),
        withTiming(0.3, { duration })
      ),
      -1
    );

    dot2Opacity.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.3, { duration })
        ),
        -1
      )
    );

    dot3Opacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0.3, { duration })
        ),
        -1
      )
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: theme.colors.surface }]}>
        <Animated.View style={[styles.dot, dot1Style, { backgroundColor: theme.colors.primary }]} />
        <Animated.View style={[styles.dot, dot2Style, { backgroundColor: theme.colors.primary }]} />
        <Animated.View style={[styles.dot, dot3Style, { backgroundColor: theme.colors.primary }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderBottomLeftRadius: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default TypingIndicator;
