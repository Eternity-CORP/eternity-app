import React, { useCallback } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { triggerHaptic, triggerSelectionHaptic } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

interface SwipeableCardProps {
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
  enabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  onConfirm,
  onCancel,
  onDismiss,
  children,
  enabled = true,
}) => {
  const translateX = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  const handleConfirm = useCallback(() => {
    triggerHaptic('safe');
    onConfirm();
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    triggerHaptic('warning');
    onCancel();
  }, [onCancel]);

  const triggerThresholdHaptic = useCallback(() => {
    triggerSelectionHaptic();
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      translateX.value = event.translationX;

      // Trigger haptic when crossing threshold
      const crossedThreshold = 
        Math.abs(event.translationX) > SWIPE_THRESHOLD;
      
      if (crossedThreshold && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(triggerThresholdHaptic)();
      } else if (!crossedThreshold && hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      hasTriggeredHaptic.value = false;

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - Confirm
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(handleConfirm)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - Cancel
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 }, () => {
          runOnJS(handleCancel)();
        });
      } else {
        // Return to center
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const confirmIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const cancelIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, cardStyle]}>
        {/* Confirm indicator (right side) */}
        <Animated.View style={[styles.indicator, styles.confirmIndicator, confirmIndicatorStyle]}>
          <Animated.Text style={styles.indicatorText}>✓ CONFIRM</Animated.Text>
        </Animated.View>

        {/* Cancel indicator (left side) */}
        <Animated.View style={[styles.indicator, styles.cancelIndicator, cancelIndicatorStyle]}>
          <Animated.Text style={styles.indicatorText}>✗ CANCEL</Animated.Text>
        </Animated.View>

        {children}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  confirmIndicator: {
    right: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  cancelIndicator: {
    left: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default SwipeableCard;
