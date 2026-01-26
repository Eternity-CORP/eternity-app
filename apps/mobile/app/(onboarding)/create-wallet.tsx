import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { generateWalletThunk, type AccountType } from '@/src/store/slices/wallet-slice';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

type WordCount = 12 | 24;

export default function CreateWalletScreen() {
  const { theme: dynamicTheme } = useTheme();
  const { accountType: accountTypeParam } = useLocalSearchParams<{ accountType?: string }>();
  const accountType: AccountType = (accountTypeParam === 'real' || accountTypeParam === 'test') ? accountTypeParam : 'test';
  const dispatch = useAppDispatch();
  const [isCreating, setIsCreating] = useState(false);
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const isTestWallet = accountType === 'test';

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      await dispatch(generateWalletThunk({ wordCount, type: accountType })).unwrap();
      // Navigate to seed phrase screen (mnemonic is in Redux state)
      router.push({
        pathname: '/(onboarding)/seed-phrase',
        params: { wordCount: wordCount.toString(), accountType },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate wallet. Please try again.');
      console.error('Wallet generation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.container, { backgroundColor: dynamicTheme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>
          Create {isTestWallet ? 'Test' : 'New'} Wallet
        </Text>
        <Text style={[styles.description, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
          {isTestWallet
            ? 'Create a test wallet to explore features with free testnet tokens. No real funds involved.'
            : "We'll generate a secure recovery phrase for you. Make sure to write it down and keep it safe."}
        </Text>
        {isTestWallet && (
          <View style={styles.testBadge}>
            <FontAwesome name="flask" size={14} color="#F59E0B" />
            <Text style={[styles.testBadgeText, theme.typography.caption, { color: '#F59E0B' }]}>
              Test Mode - Testnet Only
            </Text>
          </View>
        )}

        {/* Word Count Selection */}
        <View style={styles.wordCountSection}>
          <Text style={[styles.wordCountLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Recovery Phrase Length
          </Text>
          <View style={styles.wordCountOptions}>
            <TouchableOpacity
              style={[
                styles.wordCountOption,
                { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.buttonSecondaryBorder },
                wordCount === 12 && { backgroundColor: dynamicTheme.colors.buttonPrimary, borderColor: dynamicTheme.colors.buttonPrimary },
              ]}
              onPress={() => setWordCount(12)}
              disabled={isCreating}
            >
              <Text
                style={[
                  styles.wordCountOptionText,
                  theme.typography.heading,
                  { color: dynamicTheme.colors.textPrimary },
                  wordCount === 12 && { color: dynamicTheme.colors.buttonPrimaryText },
                ]}
              >
                12 Words
              </Text>
              <Text
                style={[
                  styles.wordCountOptionSubtext,
                  theme.typography.caption,
                  wordCount === 12
                    ? { color: dynamicTheme.colors.buttonPrimaryText }
                    : { color: dynamicTheme.colors.textSecondary },
                ]}
              >
                Standard security
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wordCountOption,
                { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.buttonSecondaryBorder },
                wordCount === 24 && { backgroundColor: dynamicTheme.colors.buttonPrimary, borderColor: dynamicTheme.colors.buttonPrimary },
              ]}
              onPress={() => setWordCount(24)}
              disabled={isCreating}
            >
              <Text
                style={[
                  styles.wordCountOptionText,
                  theme.typography.heading,
                  { color: dynamicTheme.colors.textPrimary },
                  wordCount === 24 && { color: dynamicTheme.colors.buttonPrimaryText },
                ]}
              >
                24 Words
              </Text>
              <Text
                style={[
                  styles.wordCountOptionSubtext,
                  theme.typography.caption,
                  wordCount === 24
                    ? { color: dynamicTheme.colors.buttonPrimaryText }
                    : { color: dynamicTheme.colors.textSecondary },
                ]}
              >
                Enhanced security
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.warningContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
          <FontAwesome name="lightbulb-o" size={20} color={dynamicTheme.colors.textSecondary} style={styles.warningIcon} />
          <Text style={[styles.warning, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            If you lose your recovery phrase, you will lose access to your wallet forever.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { backgroundColor: dynamicTheme.colors.buttonPrimary }, isCreating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={isCreating}
        >
          <Text style={[styles.buttonText, { color: dynamicTheme.colors.buttonPrimaryText }]}>
            {isCreating ? 'Creating...' : `Generate ${wordCount}-Word Recovery Phrase`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, { backgroundColor: dynamicTheme.colors.buttonSecondary, borderColor: dynamicTheme.colors.buttonSecondaryBorder }]}
          onPress={() => router.back()}
          disabled={isCreating}
        >
          <Text style={[styles.buttonText, { color: dynamicTheme.colors.textPrimary }]}>
            Back
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
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  description: {
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  testBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.lg,
  },
  testBadgeText: {
    fontWeight: '600',
  },
  wordCountSection: {
    marginBottom: theme.spacing.xl,
  },
  wordCountLabel: {
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordCountOptions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  wordCountOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.buttonSecondaryBorder,
    alignItems: 'center',
  },
  wordCountOptionSelected: {
    backgroundColor: theme.colors.buttonPrimary,
    borderColor: theme.colors.buttonPrimary,
  },
  wordCountOptionText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  wordCountOptionSubtext: {
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  warningIcon: {
    marginTop: 2,
  },
  warning: {
    flex: 1,
    lineHeight: 20,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...theme.typography.heading,
  },
});
