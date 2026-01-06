import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { ItemCardFront, TransactionIntent } from './ItemCardFront';
import { ItemCardBack, TransactionStats } from './ItemCardBack';
import { styles as cardStyles } from './styles';
import { triggerHaptic, triggerSelectionHaptic } from '../../utils/haptics';

export type RiskLevel = 'safe' | 'caution' | 'warning';

interface ItemCardProps {
  transaction: TransactionIntent;
  stats: TransactionStats;
  riskLevel: RiskLevel;
  riskReasons?: string[];
  onFlip?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const SWIPE_THRESHOLD = 100;

export const ItemCard: React.FC<ItemCardProps> = ({
  transaction,
  stats,
  riskLevel,
  riskReasons,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    triggerHaptic(riskLevel);
  }, [riskLevel]);

  const handleFlip = () => {
    triggerSelectionHaptic();
    flipAnimation.value = withSpring(isFlipped ? 0 : 180, {
      damping: 15,
      stiffness: 100,
    });
    setIsFlipped(!isFlipped);
    onFlip?.();
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 180], [0, 180]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      zIndex: isFlipped ? 0 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 180], [180, 360]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden',
      zIndex: isFlipped ? 1 : 0,
    };
  });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    } else if (direction === 'right' && onSwipeRight) {
      onSwipeRight();
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      translateX.value = event.translationX * 0.5;
    })
    .onEnd((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-300, {}, () => {
          runOnJS(handleSwipeComplete)('left');
        });
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(300, {}, () => {
          runOnJS(handleSwipeComplete)('right');
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleFlip)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureHandlerRootView style={localStyles.gestureRoot}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[cardStyles.container, cardAnimatedStyle]}>
          <ItemCardFront
            transaction={transaction}
            riskLevel={riskLevel}
            onFlip={handleFlip}
            animatedStyle={frontAnimatedStyle}
          />
          <ItemCardBack
            stats={stats}
            riskLevel={riskLevel}
            onFlip={handleFlip}
            animatedStyle={backAnimatedStyle}
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const localStyles = StyleSheet.create({
  gestureRoot: {
    flex: 0,
  },
});

export default ItemCard;
