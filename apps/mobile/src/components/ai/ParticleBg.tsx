/**
 * ParticleBg — static particle logo background for confirmation cards
 * Particles are placed in logo shape immediately with subtle breathing
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 50;
const COLORS = ['#3388FF', '#00E5FF', '#8B5CF6', 'rgba(255,255,255,0.6)'];

// Logo outline points (normalized 0-1) — simplified E-Y infinity shape
function generateLogoPoints(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const leftCount = Math.floor(count / 2);
  for (let i = 0; i < leftCount; i++) {
    const t = (i / leftCount) * Math.PI * 2;
    points.push({
      x: 0.28 + Math.cos(t) * 0.14,
      y: 0.5 + Math.sin(t) * 0.28,
    });
  }
  const rightCount = count - leftCount;
  for (let i = 0; i < rightCount; i++) {
    const t = (i / rightCount) * Math.PI * 2;
    points.push({
      x: 0.72 + Math.cos(t) * 0.14,
      y: 0.5 + Math.sin(t) * 0.28,
    });
  }
  return points;
}

const LOGO_POINTS = generateLogoPoints(PARTICLE_COUNT);

function Particle({ index, width, height }: { index: number; width: number; height: number }) {
  const target = LOGO_POINTS[index % LOGO_POINTS.length];
  const color = COLORS[index % COLORS.length];
  const size = useMemo(() => 1.2 + Math.random() * 1.5, []);
  const phase = useMemo(() => Math.random() * 2000, []);

  const baseX = target.x * width;
  const baseY = target.y * height;

  // Subtle breathing animation
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const opacity = useSharedValue(0.15 + Math.random() * 0.2);

  React.useEffect(() => {
    offsetX.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 2500 + phase, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1.5, { duration: 2500 + phase, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    offsetY.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 3000 + phase, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1.5, { duration: 3000 + phase, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.12, { duration: 2000 + phase }),
        withTiming(0.3, { duration: 2000 + phase })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: baseX + offsetX.value },
      { translateY: baseY + offsetY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function ParticleBg() {
  const [layout, setLayout] = React.useState({ width: 0, height: 0 });

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
      pointerEvents="none"
    >
      {layout.width > 0 &&
        Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <Particle
            key={i}
            index={i}
            width={layout.width}
            height={layout.height}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 16,
  },
  particle: {
    position: 'absolute',
  },
});
