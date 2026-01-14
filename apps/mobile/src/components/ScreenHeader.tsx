/**
 * Shared ScreenHeader Component
 * Displays a header with back button, title, and optional right element
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({
  title,
  onBack,
  showBackButton = true,
  rightElement,
}: ScreenHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <FontAwesome name="arrow-left" size={16} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={[styles.title, theme.typography.title]}>{title}</Text>
      {rightElement ? (
        <View style={styles.backButton}>{rightElement}</View>
      ) : (
        <View style={styles.backButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
});
