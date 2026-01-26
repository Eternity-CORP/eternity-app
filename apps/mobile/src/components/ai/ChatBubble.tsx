/**
 * ChatBubble Component
 * Displays a single chat message with user/assistant styling
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import type { ChatMessage } from '@/src/services/ai-service';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { theme: dynamicTheme, isDark } = useTheme();
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
          colors={isDark ? ['#FFFFFF', '#E0E0E0'] : ['#333333', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={[styles.userText, { color: isDark ? '#000000' : '#FFFFFF' }]}>{message.content}</Text>
        </LinearGradient>
        <Text style={[styles.timestamp, { color: dynamicTheme.colors.textTertiary }]}>{formattedTime}</Text>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={[styles.assistantBubble, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}>
        <Text style={[styles.assistantText, { color: dynamicTheme.colors.textPrimary }]}>{message.content}</Text>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={[styles.toolCallsContainer, { borderTopColor: dynamicTheme.colors.border }]}>
            {message.toolCalls.map((tool, index) => (
              <View key={index} style={[styles.toolCallBadge, { backgroundColor: dynamicTheme.colors.accent + '20' }]}>
                <Text style={[styles.toolCallText, { color: dynamicTheme.colors.accent }]}>{tool.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text style={[styles.timestamp, { color: dynamicTheme.colors.textTertiary }]}>{formattedTime}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  assistantContainer: {
    alignItems: 'flex-start',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  userBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.spacing.xs,
  },
  assistantBubble: {
    maxWidth: '85%',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  assistantText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  timestamp: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  toolCallsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toolCallBadge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  toolCallText: {
    ...theme.typography.label,
    color: theme.colors.accent,
  },
});
