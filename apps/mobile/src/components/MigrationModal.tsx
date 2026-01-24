/**
 * MigrationModal Component
 * One-time modal explaining the test/real accounts migration
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '@/src/constants/theme';

export interface MigrationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export function MigrationModal({ visible, onDismiss }: MigrationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <Text style={styles.icon}>🎉</Text>

          {/* Title */}
          <Text style={styles.title}>New: Test & Real Accounts</Text>

          {/* Description */}
          <Text style={styles.description}>
            Your existing accounts are now marked as{' '}
            <Text style={styles.testHighlight}>TEST</Text> accounts (testnet).
          </Text>
          <Text style={styles.description}>
            You can now create{' '}
            <Text style={styles.realHighlight}>REAL</Text> accounts for mainnet
            transactions with real value.
          </Text>

          {/* Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    width: width - 48,
    maxWidth: 340,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 24,
  },
  testHighlight: {
    color: '#F59E0B', // Orange for TEST
    fontWeight: '700',
  },
  realHighlight: {
    color: '#10B981', // Green for REAL
    fontWeight: '700',
  },
  button: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    width: '100%',
  },
  buttonText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
    textAlign: 'center',
  },
});
