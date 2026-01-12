import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '@/src/constants/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.title, theme.typography.title]}>
          Welcome to E-Y
        </Text>
        <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textSecondary }]}>
          Your secure crypto wallet with BLIK codes
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => router.push('/(onboarding)/create-wallet')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>
            Create Wallet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push('/(onboarding)/import-wallet')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            Import Wallet
          </Text>
        </TouchableOpacity>
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
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  actions: {
    gap: theme.spacing.md,
  },
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  buttonText: {
    ...theme.typography.heading,
  },
});
