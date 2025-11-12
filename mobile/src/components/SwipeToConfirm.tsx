import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.7; // 70% of container width

interface SwipeToConfirmProps {
  onConfirm: () => void;
  text?: string;
  disabled?: boolean;
  backgroundColor?: string;
  thumbColor?: string;
  textColor?: string;
}

export default function SwipeToConfirm({
  onConfirm,
  text = 'Slide to confirm',
  disabled = false,
  backgroundColor = '#4ADE80',
  thumbColor = '#FFFFFF',
  textColor = '#FFFFFF',
}: SwipeToConfirmProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const containerWidth = SCREEN_WIDTH - 64; // padding consideration
  const thumbSize = 56;
  const maxTranslateX = containerWidth - thumbSize - 8; // 8 for padding

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        // Start animation
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabled) return;

        const newX = Math.max(0, Math.min(gestureState.dx, maxTranslateX));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled) return;

        const swipeDistance = gestureState.dx;
        const threshold = maxTranslateX * SWIPE_THRESHOLD;

        if (swipeDistance >= threshold) {
          // Success! Complete the swipe
          Animated.spring(translateX, {
            toValue: maxTranslateX,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start(() => {
            onConfirm();
            // Reset after a short delay
            setTimeout(() => {
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                speed: 20,
                bounciness: 8,
              }).start();
            }, 500);
          });
        } else {
          // Reset to start
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const opacity = translateX.interpolate({
    inputRange: [0, maxTranslateX * 0.5, maxTranslateX],
    outputRange: [1, 0.5, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor, opacity: disabled ? 0.5 : 1 }]}>
      <Animated.Text style={[styles.text, { color: textColor, opacity }]}>
        {text}
      </Animated.Text>

      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="chevron-forward" size={28} color={backgroundColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
