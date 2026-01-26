/**
 * Balance Grid Background Component
 * Renders a subtle grid pattern behind the balance section
 */

import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '@/src/contexts';

interface BalanceGridBackgroundProps {
  children: React.ReactNode;
  height?: number;
}

export function BalanceGridBackground({
  children,
  height = 200,
}: BalanceGridBackgroundProps) {
  const { theme, isDark } = useTheme();
  const { width } = Dimensions.get('window');
  const spacing = 40;
  const rows = Math.ceil(height / spacing) + 1;
  const cols = Math.ceil(width / spacing) + 1;

  // Unique prefix for gradient IDs to handle theme changes
  const gradientPrefix = isDark ? 'dark' : 'light';

  return (
    <View style={[styles.container, { height, backgroundColor: theme.colors.background }]}>
      <Svg key={gradientPrefix} style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          {/* Radial fade effect using linear gradient mask */}
          <LinearGradient id={`${gradientPrefix}-fadeTop`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.background} stopOpacity="1" />
            <Stop offset="0.3" stopColor={theme.colors.background} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${gradientPrefix}-fadeBottom`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.7" stopColor={theme.colors.background} stopOpacity="0" />
            <Stop offset="1" stopColor={theme.colors.background} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id={`${gradientPrefix}-fadeLeft`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={theme.colors.background} stopOpacity="1" />
            <Stop offset="0.2" stopColor={theme.colors.background} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${gradientPrefix}-fadeRight`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.8" stopColor={theme.colors.background} stopOpacity="0" />
            <Stop offset="1" stopColor={theme.colors.background} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {Array.from({ length: rows }).map((_, i) => (
          <Line
            key={`h-${i}`}
            x1="0"
            y1={i * spacing}
            x2={width}
            y2={i * spacing}
            stroke={theme.colors.gridLine}
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: cols }).map((_, i) => (
          <Line
            key={`v-${i}`}
            x1={i * spacing}
            y1="0"
            x2={i * spacing}
            y2={height}
            stroke={theme.colors.gridLine}
            strokeWidth="1"
          />
        ))}

        {/* Fade overlays for vignette effect */}
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientPrefix}-fadeTop)`} />
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientPrefix}-fadeBottom)`} />
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientPrefix}-fadeLeft)`} />
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientPrefix}-fadeRight)`} />
      </Svg>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
