/**
 * SuggestionCard Component
 * Horizontal card for proactive AI suggestions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/constants/theme';
import { aiChat } from '@/src/constants/ai-chat-theme';
import type { AiSuggestion } from '@/src/services/ai-service';

interface SuggestionCardProps {
  suggestion: AiSuggestion;
  onPress: (suggestion: AiSuggestion) => void;
  onDismiss: (id: string) => void;
}

const SUGGESTION_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  payment_reminder: 'calendar',
  security_alert: 'shield',
  transaction_tip: 'lightbulb-o',
  savings_tip: 'line-chart',
  default: 'magic',
};

const ACCENT_COLORS: Record<string, string> = {
  payment_reminder: aiChat.accentAmber,
  security_alert: aiChat.accentRed,
  transaction_tip: aiChat.accentPurple,
  savings_tip: aiChat.accentGreen,
  default: aiChat.accentBlue,
};

export function SuggestionCard({ suggestion, onPress, onDismiss }: SuggestionCardProps) {
  const iconName = SUGGESTION_ICONS[suggestion.type] || SUGGESTION_ICONS.default;
  const accentColor = ACCENT_COLORS[suggestion.type] || ACCENT_COLORS.default;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(suggestion);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(suggestion.id);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="times" size={12} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={[styles.iconContainer, { backgroundColor: accentColor + '26' }]}>
          <FontAwesome name={iconName} size={20} color={accentColor} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {suggestion.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {suggestion.message}
        </Text>

        {suggestion.action && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionText}>{suggestion.action.label}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    marginRight: theme.spacing.md,
  },
  card: {
    backgroundColor: aiChat.glassCard.bg,
    borderWidth: 1,
    borderColor: aiChat.glassCard.border,
    borderRadius: 16,
    padding: theme.spacing.md,
    minHeight: 140,
  },
  dismissButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: aiChat.text.primary,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontSize: 12,
    color: aiChat.text.secondary,
    lineHeight: 18,
  },
  actionBadge: {
    marginTop: theme.spacing.sm,
    backgroundColor: 'rgba(51,136,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(51,136,255,0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: aiChat.accentBlue,
  },
});
