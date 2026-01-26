import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function WelcomeScreen() {
  const { theme: dynamicTheme } = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>
          Welcome to E-Y
        </Text>
        <Text style={[styles.subtitle, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
          Your secure crypto wallet with BLIK codes
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonReal, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
          onPress={() => router.push({
            pathname: '/(onboarding)/create-wallet',
            params: { accountType: 'real' },
          })}
        >
          <View style={styles.buttonContent}>
            <FontAwesome name="diamond" size={20} color={dynamicTheme.colors.buttonPrimaryText} style={styles.buttonIcon} />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                New Wallet
              </Text>
              <Text style={[styles.buttonSubtext, { color: dynamicTheme.colors.buttonPrimaryText, opacity: 0.8 }]}>
                Create a new real wallet
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, { backgroundColor: dynamicTheme.colors.buttonSecondary, borderColor: dynamicTheme.colors.buttonSecondaryBorder }]}
          onPress={() => router.push('/(onboarding)/import-wallet')}
        >
          <View style={styles.buttonContent}>
            <FontAwesome name="download" size={20} color={dynamicTheme.colors.textPrimary} style={styles.buttonIcon} />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, { color: dynamicTheme.colors.textPrimary }]}>
                Existing Wallet
              </Text>
              <Text style={[styles.buttonSubtext, { color: dynamicTheme.colors.textSecondary }]}>
                Import with recovery phrase
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonTest, { backgroundColor: dynamicTheme.colors.buttonSecondary }]}
          onPress={() => router.push({
            pathname: '/(onboarding)/create-wallet',
            params: { accountType: 'test' },
          })}
        >
          <View style={styles.buttonContent}>
            <FontAwesome name="flask" size={20} color="#F59E0B" style={styles.buttonIcon} />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonText, { color: dynamicTheme.colors.textPrimary }]}>
                New Test Wallet
              </Text>
              <Text style={[styles.buttonSubtext, { color: dynamicTheme.colors.textSecondary }]}>
                For testing with free tokens
              </Text>
            </View>
          </View>
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
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  buttonIcon: {
    marginRight: theme.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonReal: {
    backgroundColor: theme.colors.buttonPrimary,
    borderWidth: 2,
    borderColor: '#10B981', // Green border for real wallet
  },
  buttonSecondary: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  buttonTest: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 2,
    borderColor: '#F59E0B', // Orange border for test wallet
  },
  buttonText: {
    ...theme.typography.heading,
  },
  buttonSubtext: {
    ...theme.typography.caption,
    marginTop: 2,
  },
});
