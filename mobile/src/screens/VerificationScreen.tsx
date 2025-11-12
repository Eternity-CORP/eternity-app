import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { importWallet, initializeWallet } from '../services/walletService';
import { saveWallet, isWalletExists } from '../services/cryptoService';
import { setBiometricEnabled, isBiometricAvailable } from '../services/biometricService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export default function VerificationScreen({ route, navigation }: Props) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Verify Seed Phrase</Text>
      <Text style={styles.subTitle}>Words to verify: {words.length}</Text>
      <Text style={styles.description}>
        To confirm you've saved your seed phrase correctly, please enter the following words:
      </Text>

      <View style={styles.testContainer}>
        {testIndices.map((wordIndex, idx) => (
          <View key={idx} style={styles.testItem}>
            <Text style={styles.testLabel}>Word #{wordIndex + 1}</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="Enter word"
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
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>💡 Tip: Words are case-insensitive</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={saving}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Verify & Continue'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 40 },
  subTitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  description: { fontSize: 16, color: '#666', marginBottom: 32, lineHeight: 22 },
  testContainer: { marginBottom: 24 },
  testItem: { marginBottom: 20 },
  testLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  errorBox: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#C62828', fontSize: 14, textAlign: 'center' },
  infoBox: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 14, color: '#1976D2', textAlign: 'center' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, marginBottom: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  backButton: { padding: 16 },
  backButtonText: { color: '#007AFF', fontSize: 16, textAlign: 'center' },
});
