import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../src/constants/theme';

export default function ShardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <View style={styles.scanIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <View style={styles.settingsIcon} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar} />
      </View>

      {/* Username */}
      <Text style={styles.username}>@username</Text>
      <Text style={styles.joinDate}>Set up your identity</Text>

      {/* Verification Cards */}
      <View style={styles.verificationGrid}>
        <View style={styles.verificationCard}>
          <View style={[styles.verificationIcon, { backgroundColor: colors.success }]} />
          <Text style={styles.verificationLabel}>Identity</Text>
          <Text style={styles.verificationStatus}>Not verified</Text>
        </View>
        <View style={styles.verificationCard}>
          <View style={[styles.verificationIcon, { backgroundColor: colors.error }]} />
          <Text style={styles.verificationLabel}>Official ID</Text>
          <Text style={styles.verificationStatus}>Tap to add</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Shard Actions</Text>

        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionIcon} />
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Claim @username</Text>
            <Text style={styles.actionSubtitle}>Reserve your unique identity</Text>
          </View>
          <TouchableOpacity style={styles.claimButton}>
            <Text style={styles.claimButtonText}>Claim</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionIcon} />
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Invite Friends</Text>
            <Text style={styles.actionSubtitle}>Share E-Y with others</Text>
          </View>
          <TouchableOpacity style={styles.claimButton}>
            <Text style={styles.claimButtonText}>Invite</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  settingsIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderRadius: 10,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
  },
  username: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  joinDate: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  verificationGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  verificationCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  verificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  verificationLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  verificationStatus: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHover,
    marginRight: spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  claimButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBorder,
  },
  claimButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
