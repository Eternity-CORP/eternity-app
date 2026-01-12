import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/src/constants/theme';

export default function ShardScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      <Text style={[styles.title, theme.typography.title]}>Shard</Text>
      <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textSecondary }]}>
        SHARD identity features coming soon
      </Text>
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
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    textAlign: 'center',
  },
});
