import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

interface ActionButtonsProps {
  onOpenActionsMenu: () => void;
}

export function ActionButtons({ onOpenActionsMenu }: ActionButtonsProps) {
  const { theme: dynamicTheme } = useTheme();

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={[styles.actionButtonPrimary, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
        onPress={() => router.push('/send/token')}
      >
        <Text style={[styles.actionButtonPrimaryText, { color: dynamicTheme.colors.buttonPrimaryText }]}>Send</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButtonSecondary, { borderColor: dynamicTheme.colors.buttonSecondaryBorder }]}
        onPress={() => router.push('/receive')}
      >
        <Text style={[styles.actionButtonSecondaryText, { color: dynamicTheme.colors.buttonSecondaryText }]}>Receive</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButtonSecondary, { borderColor: dynamicTheme.colors.buttonSecondaryBorder }]}
        onPress={() => router.push('/deposit' as any)}
      >
        <Text style={[styles.actionButtonSecondaryText, { color: dynamicTheme.colors.buttonSecondaryText }]}>Buy</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButtonMore, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.border }]}
        onPress={onOpenActionsMenu}
      >
        <FontAwesome name="ellipsis-h" size={18} color={dynamicTheme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actionButtonSecondaryText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  actionButtonMore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
