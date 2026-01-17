/**
 * BLIK Choice Screen
 * Choose between Send (pay someone's code) or Receive (generate your code)
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function BlikIndexScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="BLIK Transfer" />

      <View style={styles.content}>
        <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textSecondary }]}>
          Send or receive crypto instantly using a 6-digit code
        </Text>

        <View style={styles.options}>
          {/* Send Option - Enter someone's code to pay */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/blik/enter-code')}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.buttonPrimary }]}>
              <FontAwesome name="arrow-up" size={24} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, theme.typography.heading]}>
                Send
              </Text>
              <Text style={[styles.optionDescription, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Enter recipient's code to pay
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          {/* Receive Option - Generate code to receive */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/blik/receive/token')}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.success }]}>
              <FontAwesome name="arrow-down" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, theme.typography.heading]}>
                Receive
              </Text>
              <Text style={[styles.optionDescription, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Generate code for sender
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* How it works section */}
        <View style={styles.howItWorks}>
          <Text style={[styles.howItWorksTitle, theme.typography.heading]}>
            How it works
          </Text>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Receiver generates a 6-digit code
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Sender enters the code to pay
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Funds transfer instantly
            </Text>
          </View>
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
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  options: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  optionDescription: {
    // color set inline
  },
  howItWorks: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  howItWorksTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stepNumberText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
  },
});
