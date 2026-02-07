/**
 * Markdown rendering utility
 * Parses inline markdown (**bold**, *italic*, `code`) into React Native Text nodes
 */

import React from 'react';
import { Text, type TextStyle } from 'react-native';

/** Parse inline markdown (**bold**, *italic*, `code`) into RN Text nodes */
export function renderMarkdown(text: string, baseStyle: TextStyle): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t${lastIndex}`} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    if (match[2]) {
      parts.push(
        <Text key={`b${match.index}`} style={[baseStyle, { fontWeight: '700' }]}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      parts.push(
        <Text key={`i${match.index}`} style={[baseStyle, { fontStyle: 'italic' }]}>
          {match[3]}
        </Text>
      );
    } else if (match[4]) {
      parts.push(
        <Text
          key={`c${match.index}`}
          style={[baseStyle, { fontFamily: 'Courier', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: 13 }]}
        >
          {match[4]}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t${lastIndex}`} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts.length > 0 ? parts : [<Text key="full" style={baseStyle}>{text}</Text>];
}
