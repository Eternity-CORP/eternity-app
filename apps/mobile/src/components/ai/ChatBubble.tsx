/**
 * ChatBubble Component
 * Displays a single chat message with user/AI styling and inline markdown
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/constants/theme';
import { aiChat } from '@/src/constants/ai-chat-theme';
import type { ChatMessage } from '@/src/services/ai-service';

interface ChatBubbleProps {
  message: ChatMessage;
}

/** Parse inline markdown (**bold**, *italic*, `code`) into RN Text nodes */
function renderMarkdown(text: string, baseStyle: TextStyle): React.ReactNode[] {
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

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [message.timestamp]);

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <LinearGradient
          colors={[aiChat.userBubble.gradientStart, aiChat.userBubble.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{renderMarkdown(message.content, styles.userText)}</Text>
        </LinearGradient>
        <Text style={styles.timestamp}>{formattedTime}</Text>
      </View>
    );
  }

  return (
    <View style={styles.aiContainer}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{renderMarkdown(message.content, styles.aiText)}</Text>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolCallsContainer}>
            {message.toolCalls.map((tool, index) => (
              <View key={index} style={styles.toolCallBadge}>
                <Text style={styles.toolCallText}>{tool.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.timestamp}>{formattedTime}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  aiContainer: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  userBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: aiChat.userBubble.border,
  },
  aiBubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: 4,
    backgroundColor: aiChat.aiBubble.bg,
    borderWidth: 1,
    borderColor: aiChat.aiBubble.border,
  },
  userText: {
    ...theme.typography.body,
    color: aiChat.text.primary,
  },
  aiText: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    lineHeight: 20,
  },
  timestamp: {
    ...theme.typography.label,
    fontSize: 10,
    color: aiChat.text.timestamp,
    marginTop: theme.spacing.xs,
  },
  toolCallsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: aiChat.aiBubble.border,
  },
  toolCallBadge: {
    backgroundColor: 'rgba(51,136,255,0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(51,136,255,0.2)',
  },
  toolCallText: {
    ...theme.typography.label,
    color: aiChat.accentBlue,
  },
});
