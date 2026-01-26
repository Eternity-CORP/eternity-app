/**
 * Dot Background Component
 * Renders a subtle dot pattern behind content, matching website style
 */

import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

interface DotBackgroundProps {
  spacing?: number;
  dotSize?: number;
  children: React.ReactNode;
}

export function DotBackground({
  spacing = 24,
  dotSize = 1.5,
  children,
}: DotBackgroundProps) {
  const { theme: dynamicTheme } = useTheme();
  const { width, height } = Dimensions.get('window');
  const rows = Math.ceil(height / spacing);
  const cols = Math.ceil(width / spacing);

  return (
    <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={col * spacing + spacing / 2}
              cy={row * spacing + spacing / 2}
              r={dotSize}
              fill={dynamicTheme.colors.gridLine}
            />
          ))
        )}
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
