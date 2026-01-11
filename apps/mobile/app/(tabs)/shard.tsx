import { StyleSheet, View, Text } from 'react-native';
import { theme } from '@/src/constants/theme';

export default function ShardScreen() {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, theme.typography.title]}>Shard</Text>
      <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textSecondary }]}>
        SHARD identity features coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    textAlign: 'center',
  },
});
