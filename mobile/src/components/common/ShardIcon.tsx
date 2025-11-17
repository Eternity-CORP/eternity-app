import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

export type ShardIconSize = 'small' | 'medium' | 'large';

type Props = {
  size?: ShardIconSize;
  variant?: 'default' | 'rare';
};

const SIZE_MAP: Record<ShardIconSize, number> = {
  small: 18,
  medium: 22,
  large: 28,
};

export default function ShardIcon({ size = 'medium', variant = 'default' }: Props) {
  const { theme } = useTheme();
  const px = SIZE_MAP[size] ?? SIZE_MAP.medium;

  const primary = variant === 'rare' ? theme.colors.accent : theme.colors.primary;
  const secondary = variant === 'rare' ? theme.colors.secondary : theme.colors.accent;

  const w = px;
  const h = px * 1.2;

  const outerPath = `M ${w / 2} 0 L ${w} ${h * 0.35} L ${w * 0.7} ${h} L ${w * 0.3} ${h} L 0 ${h * 0.35} Z`;
  const innerPath = `M ${w / 2} ${h * 0.1} L ${w * 0.85} ${h * 0.38} L ${w * 0.6} ${h * 0.92} L ${w * 0.4} ${h * 0.92} L ${w * 0.15} ${h * 0.38} Z`;

  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="shardGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={primary} stopOpacity={1} />
            <Stop offset="1" stopColor={secondary} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>

        <Path d={outerPath} fill="url(#shardGradient)" opacity={0.96} />
        <Path d={innerPath} fill="#FFFFFF" opacity={0.14} />
      </Svg>
    </View>
  );
}
