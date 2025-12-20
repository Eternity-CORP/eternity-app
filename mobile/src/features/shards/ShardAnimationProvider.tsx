import React, { createContext, useCallback, useContext, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import ShardIcon from '../../components/common/ShardIcon';
import { useTheme } from '../../context/ThemeContext';
import { useShards } from './store/shardsSlice';

interface ShardAnimationContextValue {
  triggerShardAnimation: (earned: number, sourceCoords?: { x: number; y: number }) => void;
  setTargetRef: (ref: View | null) => void;
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
  const targetRef = useRef<View | null>(null);
  const [targetCoords, setTargetCoords] = useState({ x: 0, y: 0 });

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const setTargetRef = useCallback((ref: View | null) => {
    targetRef.current = ref;
    if (ref) {
      ref.measure((x, y, width, height, pageX, pageY) => {
        setTargetCoords({ x: pageX + width / 2, y: pageY + height / 2 });
      });
    }
  }, []);

  const triggerShardAnimation = useCallback(
    (earned: number, sourceCoords?: { x: number; y: number }) => {
      if (!earned || earned <= 0) {
        return;
      }

      applyEarnedShards(earned);

      setCount((prev) => (visible ? prev + earned : earned));
      setVisible(true);

      // Calculate animation start and end positions
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;

      // Default source: center-bottom of screen
      const startX = sourceCoords?.x ?? screenWidth / 2;
      const startY = sourceCoords?.y ?? screenHeight * 0.7;

      // Target: top-right corner (shard badge position)
      const endX = targetCoords.x || screenWidth - 60;
      const endY = targetCoords.y || 60;

      // Set initial position
      translateX.value = startX - endX;
      translateY.value = startY - endY;
      opacity.value = 0;
      scale.value = 0.6;

      // Animate to target
      opacity.value = withTiming(1, { duration: 200 });

      translateX.value = withTiming(0, {
        duration: 700,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      translateY.value = withTiming(0, {
        duration: 700,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      scale.value = withSequence(
        withTiming(1, { duration: 350 }),
        withTiming(0.8, { duration: 200 }),
        withTiming(0, { duration: 150 })
      );

      // Hide after animation
      setTimeout(() => {
        setVisible(false);
      }, 900);
    },
    [applyEarnedShards, opacity, scale, translateX, translateY, visible, targetCoords]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <ShardAnimationContext.Provider value={{ triggerShardAnimation, setTargetRef }}>
      <View style={styles.root}>
        {children}
        {visible && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={styles.overlayContainer}>
              <Animated.View
                style={[
                  styles.floatingPill,
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
    top: 60,
    right: 60,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pillText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
  },
});
