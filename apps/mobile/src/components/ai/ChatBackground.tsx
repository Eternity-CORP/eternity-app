/**
 * ChatBackground Component
 * Semi-transparent grid pattern for dark AI chat screen
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { aiChat } from '@/src/constants/ai-chat-theme';

const CELL = aiChat.grid.cellSize;

function GridPattern() {
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
        stroke={aiChat.grid.stroke}
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
        stroke={aiChat.grid.stroke}
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
