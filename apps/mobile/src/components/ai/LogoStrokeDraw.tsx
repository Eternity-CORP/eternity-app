/**
 * LogoStrokeDraw -- SVG component that draws the E-Y logo contour
 * with a neon stroke effect using react-native-svg + reanimated.
 *
 * Used as a subtle background for confirmation cards.
 *
 * Phase 1: Sequential stroke reveal via strokeDashoffset animation (~2s)
 * Phase 2: Strokes stay visible with gentle alpha breathing
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER } from '@e-y/shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DRAW_DURATION = 2000; // ms total
const BASE_OPACITY = 0.35;
const BREATH_MIN = 0.25;
const BREATH_MAX = 0.4;

/**
 * Pre-measured path lengths (measured offline from the SVG paths).
 * Using pre-computed values avoids needing DOM APIs on mobile.
 */
const PATH_LENGTHS: Record<string, number> = {
  leftOuter: 1520,
  rightOuter: 1520,
  leftInner: 2200,
  rightInner: 2200,
};

interface StrokePathProps {
  pathKey: keyof typeof LOGO_PATHS;
  index: number;
  pathCount: number;
  drawProgress: Animated.SharedValue<number>;
  breathAlpha: Animated.SharedValue<number>;
  isGlow?: boolean;
}

function StrokePath({
  pathKey,
  index,
  pathCount,
  drawProgress,
  breathAlpha,
  isGlow = false,
}: StrokePathProps) {
  const d = LOGO_PATHS[pathKey];
  const length = PATH_LENGTHS[pathKey] || 1500;

  const overlapFactor = 0.3;
  const segmentDuration = 1 / (pathCount * (1 - overlapFactor) + overlapFactor);
  const segStart = index * segmentDuration * (1 - overlapFactor);
  const segEnd = segStart + segmentDuration;

  const animatedProps = useAnimatedProps(() => {
    const progress = drawProgress.value;
    const segP = Math.max(0, Math.min(1, (progress - segStart) / (segEnd - segStart)));
    const dashOffset = length * (1 - segP);
    const alpha = breathAlpha.value;

    return {
      strokeDashoffset: dashOffset,
      strokeOpacity: segP * alpha,
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={isGlow ? 'rgba(51, 136, 255, 0.5)' : 'url(#strokeGrad)'}
      strokeWidth={isGlow ? 6 : 1.5}
      strokeDasharray={`${length}`}
      animatedProps={animatedProps}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function LogoStrokeDraw() {
  const [layout, setLayout] = React.useState({ width: 0, height: 0 });

  // Shared values for animation
  const drawProgress = useSharedValue(0);
  const breathAlpha = useSharedValue(BASE_OPACITY);

  useEffect(() => {
    // Phase 1: Draw stroke (0 -> 1)
    drawProgress.value = withTiming(1, {
      duration: DRAW_DURATION,
      easing: Easing.bezier(0.42, 0, 0.58, 1), // easeInOutCubic
    });

    // Phase 2: Breathing alpha after draw completes
    const breathDelay = DRAW_DURATION + 200;
    breathAlpha.value = withDelay(
      breathDelay,
      withRepeat(
        withSequence(
          withTiming(BREATH_MAX, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(BREATH_MIN, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const pathCount = DRAW_ORDER.length;

  if (layout.width === 0 || layout.height === 0) {
    return (
      <View
        style={styles.container}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setLayout({ width, height });
        }}
        pointerEvents="none"
      />
    );
  }

  // Scale logo to ~65% of container, centered
  const scaleX = (layout.width * 0.65) / LOGO_VIEWBOX.width;
  const scaleY = (layout.height * 0.65) / LOGO_VIEWBOX.height;
  const scale = Math.min(scaleX, scaleY);
  const logoW = LOGO_VIEWBOX.width * scale;
  const logoH = LOGO_VIEWBOX.height * scale;
  const offsetX = (layout.width - logoW) / 2;
  const offsetY = (layout.height - logoH) / 2;

  // ViewBox string for proper scaling
  const viewBox = `${LOGO_VIEWBOX.width * (-offsetX / logoW)} ${LOGO_VIEWBOX.height * (-offsetY / logoH)} ${LOGO_VIEWBOX.width * (layout.width / logoW)} ${LOGO_VIEWBOX.height * (layout.height / logoH)}`;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
      pointerEvents="none"
    >
      <Svg
        width={layout.width}
        height={layout.height}
        viewBox={viewBox}
      >
        <Defs>
          <LinearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3388FF" />
            <Stop offset="1" stopColor="#00E5FF" />
          </LinearGradient>
        </Defs>

        {/* Glow layer (larger stroke, lower opacity) */}
        {DRAW_ORDER.map((key, i) => (
          <StrokePath
            key={`glow-${key}`}
            pathKey={key}
            index={i}
            pathCount={pathCount}
            drawProgress={drawProgress}
            breathAlpha={breathAlpha}
            isGlow
          />
        ))}

        {/* Main stroke layer */}
        {DRAW_ORDER.map((key, i) => (
          <StrokePath
            key={`main-${key}`}
            pathKey={key}
            index={i}
            pathCount={pathCount}
            drawProgress={drawProgress}
            breathAlpha={breathAlpha}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 16,
  },
});
