import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { importWallet, initializeWallet } from '../services/walletService';
import { saveWallet, isWalletExists } from '../services/cryptoService';
import { setBiometricEnabled, isBiometricAvailable } from '../services/biometricService';
import SafeScreen from '../components/common/SafeScreen';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export default function VerificationScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const { mnemonic } = route.params;
  const words = useMemo(() => mnemonic.trim().split(/\s+/), [mnemonic]);

  // Generate 3 random word indices to test
  const testIndices = useMemo(() => {
    const indices = Array.from({ length: words.length }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).sort((a, b) => a - b);
  }, [words]);

  const [userInputs, setUserInputs] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (index: number, text: string) => {
    const newInputs = [...userInputs];
    newInputs[index] = text.trim().toLowerCase();
    setUserInputs(newInputs);
    setError(null);
  };

  const validateInputs = (): boolean => {
    for (let i = 0; i < testIndices.length; i++) {
      const expectedWord = words[testIndices[i]].toLowerCase();
      const userWord = userInputs[i].toLowerCase();
      if (expectedWord !== userWord) {
        return false;
      }
    }
    return true;
  };

  const handleFinish = async () => {
    setError(null);

    // Check if all inputs are filled
    if (userInputs.some(input => !input.trim())) {
      setError('Please fill in all words');
      return;
    }

    // Validate the words
    if (!validateInputs()) {
      setError('One or more words are incorrect. Please check and try again.');
      return;
    }

    try {
      setSaving(true);
      const wallet = await importWallet(mnemonic);
      await saveWallet(mnemonic, wallet.privateKey);

      // Initialize wallet metadata and create first account
      await initializeWallet();

      // Confirm wallet existence to avoid navigation race
      let confirmed = await isWalletExists();
      if (!confirmed) {
        for (let i = 0; i < 3; i++) {
          await new Promise(res => setTimeout(res, 150));
          if (await isWalletExists()) { confirmed = true; break; }
        }
      }

      // Ask if user wants to enable biometrics
      const biometricAvailable = await isBiometricAvailable();
      if (biometricAvailable) {
        Alert.alert(
          'Enable Biometric Authentication?',
          'Protect your wallet with Face ID / Touch ID / Fingerprint',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: async () => {
                await setBiometricEnabled(false);
                // Wallet is now created, RootNavigator will automatically switch to MainNavigator
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
                if (!confirmed) { try { navigation.navigate('Home' as any); } catch {} }
              },
            },
            {
              text: 'Enable',
              onPress: async () => {
                await setBiometricEnabled(true);
                // Wallet is now created, RootNavigator will automatically switch to MainNavigator
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
                if (!confirmed) { try { navigation.navigate('Home' as any); } catch {} }
              },
            },
          ]
        );
      } else {
        // Wallet is now created, RootNavigator will automatically switch to MainNavigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        if (!confirmed) { try { navigation.navigate('Home' as any); } catch {} }
      }
    } catch (e) {
      // Do not log error - may contain mnemonic or private key data
      setError('Failed to save wallet. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeScreen gradient gradientColors={['#0D0D0D', '#1A1A2E']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Verify Phrase</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subTitle, { color: theme.colors.textSecondary }]}>
          Words to verify: {words.length}
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          To confirm you've saved your seed phrase correctly, please enter the following words:
        </Text>

        <View style={styles.testContainer}>
          {testIndices.map((wordIndex, idx) => (
            <View key={idx} style={styles.testItem}>
              <Text style={[styles.testLabel, { color: theme.colors.text }]}>Word #{wordIndex + 1}</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text },
                  error && { borderColor: theme.colors.error }
                ]}
                placeholder="Enter word"
                placeholderTextColor={theme.colors.muted}
                value={userInputs[idx]}
                onChangeText={(text) => handleInputChange(idx, text)}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={`Word ${wordIndex + 1} input`}
              />
            </View>
          ))}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: `${theme.colors.error}20` }]} accessibilityRole="alert">
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Text style={[styles.infoText, { color: theme.colors.primary }]}>💡 Tip: Words are case-insensitive</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, saving && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Verify & Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 22,
  },
  testContainer: {
    marginBottom: 24,
  },
  testItem: {
    marginBottom: 20,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
