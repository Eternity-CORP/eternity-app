/**
 * Grid Background Component
 * Renders a subtle grid pattern behind content, matching website style
 */

import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

interface GridBackgroundProps {
  spacing?: number;
  children: React.ReactNode;
}

export function GridBackground({ spacing = 50, children }: GridBackgroundProps) {
  const { theme: dynamicTheme } = useTheme();
  const { width, height } = Dimensions.get('window');
  const rows = Math.ceil(height / spacing) + 1;
  const cols = Math.ceil(width / spacing) + 1;

  return (
    <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        {Array.from({ length: rows }).map((_, i) => (
          <Line
            key={`h-${i}`}
            x1="0"
            y1={i * spacing}
            x2={width}
            y2={i * spacing}
            stroke={dynamicTheme.colors.gridLine}
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
            stroke={dynamicTheme.colors.gridLine}
            strokeWidth="1"
          />
        ))}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
