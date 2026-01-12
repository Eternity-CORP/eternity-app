import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { saveWalletThunk } from '@/src/store/slices/wallet-slice';
import { theme } from '@/src/constants/theme';

export default function SeedPhraseScreen() {
  const { mnemonic, wordCount } = useLocalSearchParams<{ mnemonic: string; wordCount?: string }>();
  const dispatch = useAppDispatch();
  const [words, setWords] = useState<string[]>([]);
  const [verificationWords, setVerificationWords] = useState<number[]>([]);
  const [userInputs, setUserInputs] = useState<{ [key: number]: string }>({});
  const [step, setStep] = useState<'show' | 'verify'>('show');
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const totalWords = wordCount ? parseInt(wordCount, 10) : 12;

  useEffect(() => {
    if (mnemonic) {
      const wordList = mnemonic.split(' ');
      setWords(wordList);
      // Select 3 random words for verification (or 4 for 24-word phrases)
      const verificationCount = totalWords === 24 ? 4 : 3;
      const indices = new Set<number>();
      while (indices.size < verificationCount) {
        indices.add(Math.floor(Math.random() * wordList.length));
      }
      setVerificationWords(Array.from(indices).sort((a, b) => a - b));
    }
  }, [mnemonic, totalWords]);

  const handleVerify = async () => {
    const allCorrect = verificationWords.every((index) => {
      return userInputs[index]?.toLowerCase().trim() === words[index]?.toLowerCase().trim();
    });

    if (!allCorrect) {
      Alert.alert('Error', 'Some words are incorrect. Please try again.');
      return;
    }

    // All words correct - save wallet to storage
    if (!mnemonic) {
      Alert.alert('Error', 'Mnemonic not found. Please start over.');
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(saveWalletThunk(mnemonic)).unwrap();
      setIsVerified(true);
      // Navigate to home screen
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallet. Please try again.');
      console.error('Wallet save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (step === 'show') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, theme.typography.title]}>
            Write Down Your Recovery Phrase
          </Text>
          <Text style={[styles.instruction, theme.typography.body, { color: theme.colors.textSecondary }]}>
            Write these {totalWords} words down in order and keep them safe. You'll need them to recover your wallet.
          </Text>

          <View style={styles.wordsContainer}>
            {words.map((word, index) => (
              <View key={index} style={styles.wordItem}>
                <Text style={[styles.wordNumber, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  {index + 1}.
                </Text>
                <Text style={[styles.word, theme.typography.heading]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[styles.warning, theme.typography.caption, { color: theme.colors.error }]}>
            ⚠️ Never share your recovery phrase with anyone. Store it in a safe place.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => setStep('verify')}
          >
            <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>
              I've Written It Down
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  // Verification step
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, theme.typography.title]}>
          Verify Your Recovery Phrase
        </Text>
        <Text style={[styles.instruction, theme.typography.body, { color: theme.colors.textSecondary }]}>
          Enter the words at positions {verificationWords.map((i) => i + 1).join(', ')} to confirm you've saved them correctly.
        </Text>

        <View style={styles.verificationContainer}>
          {verificationWords.map((index) => (
            <View key={index} style={styles.verificationItem}>
              <Text style={[styles.verificationLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Word {index + 1}:
              </Text>
              <View style={styles.inputContainer}>
                <Text style={[styles.input, theme.typography.body]}>
                  {userInputs[index] || ''}
                </Text>
              </View>
              <View style={styles.wordOptions}>
                {words.map((word, wordIndex) => (
                  <TouchableOpacity
                    key={wordIndex}
                    style={[
                      styles.wordOption,
                      userInputs[index] === word && styles.wordOptionSelected,
                    ]}
                    onPress={() => {
                      setUserInputs((prev) => ({ ...prev, [index]: word }));
                    }}
                  >
                    <Text
                      style={[
                        styles.wordOptionText,
                        theme.typography.caption,
                        userInputs[index] === word && { color: theme.colors.buttonPrimaryText },
                      ]}
                    >
                      {word}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (Object.keys(userInputs).length !== verificationWords.length || isSaving) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={Object.keys(userInputs).length !== verificationWords.length || isSaving}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>
            {isSaving ? 'Saving...' : 'Verify & Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setStep('show')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  instruction: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  wordItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
  },
  wordNumber: {
    marginRight: theme.spacing.sm,
    minWidth: 24,
  },
  word: {
    color: theme.colors.textPrimary,
    flex: 1,
  },
  warning: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  verificationContainer: {
    gap: theme.spacing.xl,
  },
  verificationItem: {
    marginBottom: theme.spacing.lg,
  },
  verificationLabel: {
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
    minHeight: 50,
    justifyContent: 'center',
  },
  input: {
    color: theme.colors.textPrimary,
  },
  wordOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  wordOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  wordOptionSelected: {
    backgroundColor: theme.colors.buttonPrimary,
    borderColor: theme.colors.buttonPrimary,
  },
  wordOptionText: {
    color: theme.colors.textPrimary,
  },
  actions: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
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
