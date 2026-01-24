/**
 * SuggestionCard Component
 * Horizontal card for proactive AI suggestions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/constants/theme';
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

const SUGGESTION_COLORS: Record<string, [string, string]> = {
  payment_reminder: ['#F59E0B', '#D97706'],
  security_alert: ['#EF4444', '#DC2626'],
  transaction_tip: ['#8B5CF6', '#7C3AED'],
  savings_tip: ['#22C55E', '#16A34A'],
  default: ['#0066FF', '#00D4FF'],
};

export function SuggestionCard({ suggestion, onPress, onDismiss }: SuggestionCardProps) {
  const iconName = SUGGESTION_ICONS[suggestion.type] || SUGGESTION_ICONS.default;
  const colors = SUGGESTION_COLORS[suggestion.type] || SUGGESTION_COLORS.default;

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
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="times" size={12} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <FontAwesome name={iconName} size={20} color="#FFFFFF" />
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
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    marginRight: theme.spacing.md,
  },
  gradient: {
    borderRadius: theme.borderRadius.lg,
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  message: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  actionBadge: {
    marginTop: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
