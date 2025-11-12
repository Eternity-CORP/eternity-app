import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

function hashToColors(seed: string) {
  // Simple deterministic color generation from seed
  let h1 = 0, h2 = 0, h3 = 0;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = (h1 * 31 + c) % 360;
    h2 = (h2 * 17 + c) % 360;
    h3 = (h3 * 13 + c) % 360;
  }
  const toHex = (h: number) => `hsl(${h}, 70%, 50%)`;
  return [toHex(h1), toHex(h2), toHex(h3)];
}

type Props = {
  address: string;
  size?: number;
};

export default function Avatar({ address, size = 48 }: Props) {
  const { theme } = useTheme();
  const colors = useMemo(() => hashToColors(address), [address]);

  const radius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: theme.colors.surface }]}> 
      <Svg width={size} height={size}>
        <Circle cx={radius} cy={radius} r={radius} fill={theme.colors.surface} />
        <Rect x={0} y={0} width={size} height={size / 3} fill={colors[0]} opacity={0.8} />
        <Rect x={0} y={size / 3} width={size} height={size / 3} fill={colors[1]} opacity={0.8} />
        <Rect x={0} y={(2 * size) / 3} width={size} height={size / 3} fill={colors[2]} opacity={0.8} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
