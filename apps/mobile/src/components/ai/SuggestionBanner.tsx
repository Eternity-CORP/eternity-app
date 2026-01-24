/**
 * SuggestionBanner Component
 * Banner notification for AI suggestions on home screen
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/constants/theme';
import type { AiSuggestion } from '@/src/services/ai-service';

interface SuggestionBannerProps {
  suggestion: AiSuggestion;
  onDismiss: (id: string) => void;
}

const PRIORITY_COLORS = {
  low: '#3B82F6',     // Blue
  medium: '#F59E0B',  // Amber
  high: '#EF4444',    // Red
};

const SUGGESTION_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  payment_reminder: 'calendar',
  security_alert: 'shield',
  transaction_tip: 'lightbulb-o',
  savings_tip: 'line-chart',
};

export function SuggestionBanner({ suggestion, onDismiss }: SuggestionBannerProps) {
  const priorityColor = PRIORITY_COLORS[suggestion.priority] || PRIORITY_COLORS.low;
  const iconName = SUGGESTION_ICONS[suggestion.type] || 'magic';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Handle action navigation
    if (suggestion.action?.route) {
      router.push(suggestion.action.route as any);
    } else {
      // Default: go to AI chat
      router.push('/(tabs)/ai' as any);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(suggestion.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: priorityColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
        <FontAwesome name={iconName} size={16} color={priorityColor} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {suggestion.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {suggestion.message}
        </Text>
      </View>

      <View style={styles.actions}>
        {suggestion.action?.label && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: priorityColor }]}
            onPress={handlePress}
          >
            <Text style={styles.actionButtonText}>{suggestion.action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="times" size={14} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/**
 * SuggestionBannerList Component
 * Shows multiple suggestions as stacked banners
 */
interface SuggestionBannerListProps {
  suggestions: AiSuggestion[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export function SuggestionBannerList({
  suggestions,
  onDismiss,
  maxVisible = 2,
}: SuggestionBannerListProps) {
  const visibleSuggestions = suggestions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, suggestions.length - maxVisible);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.listContainer}>
      {visibleSuggestions.map((suggestion) => (
        <SuggestionBanner
          key={suggestion.id}
          suggestion={suggestion}
          onDismiss={onDismiss}
        />
      ))}

      {hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => router.push('/(tabs)/ai' as any)}
        >
          <Text style={styles.moreButtonText}>
            +{hiddenCount} more suggestion{hiddenCount > 1 ? 's' : ''}
          </Text>
          <FontAwesome name="chevron-right" size={12} color={theme.colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  actionButtonText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    gap: theme.spacing.sm,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  moreButtonText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '500',
  },
});
