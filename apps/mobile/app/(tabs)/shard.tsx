/**
 * Shard Screen
 * SHARD Identity placeholder - coming soon
 */

import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';

export default function ShardScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <FontAwesome name="shield" size={48} color="#FFFFFF" />
        </LinearGradient>

        <Text style={styles.title}>SHARD Identity</Text>
        <Text style={styles.subtitle}>
          Your decentralized identity and reputation system
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <FontAwesome name="user" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Global username</Text>
          </View>
          <View style={styles.featureItem}>
            <FontAwesome name="star" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Reputation points</Text>
          </View>
          <View style={styles.featureItem}>
            <FontAwesome name="trophy" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Achievements & badges</Text>
          </View>
        </View>

        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  featuresContainer: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  comingSoonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
