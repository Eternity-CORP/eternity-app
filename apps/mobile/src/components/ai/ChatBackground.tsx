/**
 * ChatBackground Component
 * Semi-transparent grid pattern for AI chat screen
 * Adapts to light/dark theme
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { getAiChatTheme } from '@/src/constants/ai-chat-theme';
import { useTheme } from '@/src/contexts';

function GridPattern() {
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const CELL = aiChatTheme.grid.cellSize;

  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);

  const lines: React.ReactElement[] = [];

  for (let i = 0; i <= cols; i++) {
    lines.push(
      <Line
        key={`v${i}`}
        x1={i * CELL}
        y1={0}
        x2={i * CELL}
        y2={height}
        stroke={aiChatTheme.grid.stroke}
        strokeWidth={1}
      />,
    );
  }

  for (let j = 0; j <= rows; j++) {
    lines.push(
      <Line
        key={`h${j}`}
        x1={0}
        y1={j * CELL}
        x2={width}
        y2={j * CELL}
        stroke={aiChatTheme.grid.stroke}
        strokeWidth={1}
      />,
    );
  }

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {lines}
    </Svg>
  );
}

export const ChatBackground = React.memo(function ChatBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <GridPattern />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
