import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_QUICK_ACTIONS, QuickAction } from '../../types/chat';

interface QuickActionsProps {
  onAction: (action: QuickAction) => void;
  actions?: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAction,
  actions = DEFAULT_QUICK_ACTIONS,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.button, { backgroundColor: theme.colors.surface }]}
            onPress={() => onAction(action)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={action.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={theme.colors.primary}
            />
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6, // Bittensor style
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default QuickActions;
