import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { createWalletThunk } from '@/src/store/slices/wallet-slice';
import { theme } from '@/src/constants/theme';

export default function CreateWalletScreen() {
  const dispatch = useAppDispatch();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const result = await dispatch(createWalletThunk()).unwrap();
      // Navigate to seed phrase screen with mnemonic
      router.push({
        pathname: '/(onboarding)/seed-phrase',
        params: { mnemonic: result.mnemonic },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
      console.error('Wallet creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.title, theme.typography.title]}>
          Create New Wallet
        </Text>
        <Text style={[styles.description, theme.typography.body, { color: theme.colors.textSecondary }]}>
          We'll generate a secure 12-word recovery phrase for you. Make sure to write it down and keep it safe.
        </Text>
        <Text style={[styles.warning, theme.typography.caption, { color: theme.colors.error }]}>
          ⚠️ If you lose your recovery phrase, you will lose access to your wallet forever.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, isCreating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={isCreating}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>
            {isCreating ? 'Creating...' : 'Generate Recovery Phrase'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={isCreating}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  warning: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
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
