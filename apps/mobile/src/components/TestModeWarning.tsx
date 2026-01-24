/**
 * TestModeWarning Component
 * Warning block displayed during transactions when using a TEST account
 */

import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';

export interface TestModeWarningProps {
  style?: ViewStyle;
}

const WARNING_COLORS = {
  background: '#FEF3C7', // Subtle amber/orange
  border: '#F59E0B',     // Orange border
  icon: '#D97706',       // Darker orange for icon
  title: '#92400E',      // Dark amber for title
  text: '#78350F',       // Very dark amber for text
};

export function TestModeWarning({ style }: TestModeWarningProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <FontAwesome
          name="warning"
          size={18}
          color={WARNING_COLORS.icon}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>TEST ACCOUNT</Text>
        <Text style={styles.subtitle}>
          You're using a test account. These tokens have no real value.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WARNING_COLORS.background,
    borderWidth: 1,
    borderColor: WARNING_COLORS.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.label,
    color: WARNING_COLORS.title,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.caption,
    color: WARNING_COLORS.text,
    lineHeight: 18,
  },
});
