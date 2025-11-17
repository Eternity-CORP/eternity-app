import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import ShardIcon from '../../components/common/ShardIcon';
import { useTheme } from '../../context/ThemeContext';
import { useShards } from './store/shardsSlice';

interface ShardAnimationContextValue {
  triggerShardAnimation: (earned: number) => void;
}

const ShardAnimationContext = createContext<ShardAnimationContextValue | undefined>(
  undefined
);

export function useShardAnimation(): ShardAnimationContextValue {
  const ctx = useContext(ShardAnimationContext);
  if (!ctx) {
    throw new Error('useShardAnimation must be used within ShardAnimationProvider');
  }
  return ctx;
}

type Props = {
  children: React.ReactNode;
};

export function ShardAnimationProvider({ children }: Props) {
  const { theme } = useTheme();
  const applyEarnedShards = useShards((state) => state.applyEarnedShards);

  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const translateY = useSharedValue(8);

  const triggerShardAnimation = useCallback(
    (earned: number) => {
      if (!earned || earned <= 0) {
        return;
      }

      applyEarnedShards(earned);

      setCount((prev) => (visible ? prev + earned : earned));
      setVisible(true);

      opacity.value = 0;
      scale.value = 0.9;
      translateY.value = 8;

      opacity.value = withSequence(
        withTiming(1, { duration: 180 }),
        withDelay(640, withTiming(0, { duration: 260 }))
      );

      scale.value = withSequence(
        withTiming(1.06, { duration: 220 }),
        withTiming(1, { duration: 260 })
      );

      translateY.value = withTiming(0, { duration: 380 });

      setTimeout(() => {
        setVisible(false);
      }, 900);
    },
    [applyEarnedShards, opacity, scale, translateY, visible]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <ShardAnimationContext.Provider value={{ triggerShardAnimation }}>
      <View style={styles.root}>
        {children}
        {visible && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={styles.overlayContainer}>
              <Animated.View
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.accent,
                  },
                  animatedStyle,
                ]}
              >
                <ShardIcon size="small" />
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamilies.bold,
                    },
                  ]}
                >
                  +{count}
                </Text>
              </Animated.View>
            </View>
          </View>
        )}
      </View>
    </ShardAnimationContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 40,
    right: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
  },
});
