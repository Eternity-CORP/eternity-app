import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { importWalletThunk } from '@/src/store/slices/wallet-slice';
import { theme } from '@/src/constants/theme';
import { isValidMnemonicLength, getMnemonicWordCount } from '@e-y/crypto';

export default function ImportWalletScreen() {
  const dispatch = useAppDispatch();
  const [mnemonic, setMnemonic] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const wordCount = getMnemonicWordCount(mnemonic);
  const isValidLength = isValidMnemonicLength(mnemonic);
  const showWordCount = mnemonic.trim().length > 0;

  const handleImport = async () => {
    if (!isValidLength) {
      Alert.alert('Invalid Seed Phrase', 'Seed phrase must be 12 or 24 words.');
      return;
    }

    setIsImporting(true);
    try {
      await dispatch(importWalletThunk(mnemonic)).unwrap();
      // Navigate to home screen on success
      router.replace('/(tabs)/home');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid seed phrase. Please check your words and try again.';
      Alert.alert('Import Failed', message);
      console.error('Wallet import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, theme.typography.title]}>
          Import Wallet
        </Text>
        <Text style={[styles.description, theme.typography.body, { color: theme.colors.textSecondary }]}>
          Enter your 12 or 24-word recovery phrase to restore your wallet.
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Recovery Phrase
        </Text>
        <TextInput
          style={[
            styles.input,
            theme.typography.body,
            !isValidLength && showWordCount && styles.inputError,
          ]}
          value={mnemonic}
          onChangeText={setMnemonic}
          placeholder="Enter your recovery phrase..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isImporting}
        />
        {showWordCount && (
          <Text
            style={[
              styles.wordCount,
              theme.typography.caption,
              isValidLength ? { color: theme.colors.success } : { color: theme.colors.error },
            ]}
          >
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            {!isValidLength && ' (must be 12 or 24)'}
          </Text>
        )}
        <Text style={[styles.hint, theme.typography.caption, { color: theme.colors.textTertiary }]}>
          Separate each word with a space. Your recovery phrase is case-insensitive.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (!isValidLength || isImporting) && styles.buttonDisabled,
          ]}
          onPress={handleImport}
          disabled={!isValidLength || isImporting}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>
            {isImporting ? 'Importing...' : 'Import Wallet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={isImporting}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
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
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: theme.spacing.xxl,
  },
  label: {
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    minHeight: 120,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  wordCount: {
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  hint: {
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
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
