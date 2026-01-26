import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function WalletScreen() {
  const { theme: dynamicTheme } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
      <Text style={[styles.title, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>Wallet</Text>
      <Text style={[styles.subtitle, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
        Wallet features coming soon
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
