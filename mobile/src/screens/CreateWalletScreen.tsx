import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { createWalletWithWordCount } from '../services/walletService';
import {
  enableScreenshotProtection,
  disableScreenshotProtection,
  addScreenshotListener
} from '../services/screenshotGuard';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateWallet'>;

const SEED_DISPLAY_TIMEOUT = 180; // 3 minutes (180 seconds)

export default function CreateWalletScreen({ navigation }: Props) {
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SEED_DISPLAY_TIMEOUT);
  const [seedVisible, setSeedVisible] = useState(true);
  const [wordCount, setWordCount] = useState<12 | 24>(12);

  // Enable screenshot protection when seed is visible
  useEffect(() => {
    if (mnemonic.length > 0 && seedVisible) {
      enableScreenshotProtection();

      // Add screenshot listener (iOS only)
      const removeListener = addScreenshotListener(() => {
        Alert.alert(
          'Screenshot Detected',
          'For security reasons, taking screenshots of your seed phrase is not recommended.',
          [{ text: 'OK' }]
        );
      });

      return () => {
        disableScreenshotProtection();
        removeListener?.();
      };
    }
  }, [mnemonic, seedVisible]);

  // Timer for seed phrase display
  useEffect(() => {
    if (mnemonic.length > 0 && seedVisible && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && seedVisible) {
      setSeedVisible(false);
      Alert.alert(
        'Time Expired',
        'For security, your seed phrase has been hidden.\n\nYou will be returned to the start screen. If you saved your seed phrase, you can continue by importing your wallet.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Return to Welcome screen (start of onboarding)
              navigation.navigate('Welcome' as any);
            },
          },
        ]
      );
    }
  }, [mnemonic, timeLeft, seedVisible, navigation]);

  const handleCreateWallet = async () => {
    // First, show warning about 3-minute timer
    Alert.alert(
      '⏱️ Important Notice',
      'Your seed phrase will be displayed for 3 minutes. Please write it down carefully during this time.\n\nSecurity tips:\n• Do NOT take screenshots or photos\n• Do NOT copy to clipboard or store digitally\n• Keep your seed offline and private\n\nAfter 3 minutes, it will be hidden for security.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand',
          onPress: async () => {
            try {
              setGenerating(true);
              const created = await createWalletWithWordCount(wordCount);
              const words = created.mnemonic.trim().split(/\s+/);
              setMnemonic(words);
              setTimeLeft(SEED_DISPLAY_TIMEOUT);
              setSeedVisible(true);
            } catch (e) {
              // Do not log error - may contain sensitive wallet data
              Alert.alert('Error', 'Failed to generate wallet. Please try again.');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleShowSeed = () => {
    Alert.alert(
      'Show Seed Phrase',
      'Risk warning:\n• Ensure no one is watching your screen\n• Do NOT take screenshots or copy to clipboard\n• Keep your seed offline and private',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show',
          onPress: () => {
            setSeedVisible(true);
            setTimeLeft(SEED_DISPLAY_TIMEOUT);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (mnemonic.length > 0 && saved) {
      navigation.navigate('Verification' as any, { mnemonic: mnemonic.join(' ') } as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Wallet</Text>
      <Text style={styles.description}>
        A new wallet will be created with a secure seed phrase.
        Make sure to write it down and keep it safe.
      </Text>

      {/* Word count selector */}
      <View style={styles.selectorRow} accessibilityRole="radiogroup">
        <TouchableOpacity
          style={[styles.selectorButton, wordCount === 12 && styles.selectorButtonActive]}
          onPress={() => setWordCount(12)}
          accessibilityRole="radio"
          accessibilityState={{ selected: wordCount === 12 }}
        >
          <Text style={[styles.selectorText, wordCount === 12 && styles.selectorTextActive]}>12 words</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, wordCount === 24 && styles.selectorButtonActive]}
          onPress={() => setWordCount(24)}
          accessibilityRole="radio"
          accessibilityState={{ selected: wordCount === 24 }}
        >
          <Text style={[styles.selectorText, wordCount === 24 && styles.selectorTextActive]}>24 words</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.warningBox} accessibilityRole="alert">
        <Text style={styles.warningTitle}>⚠️ Important</Text>
        <Text style={styles.warningText}>• Never share your seed phrase with anyone</Text>
        <Text style={styles.warningText}>• Store it in a secure location</Text>
        <Text style={styles.warningText}>• You'll need it to recover your wallet</Text>
      </View>

      {mnemonic.length === 0 ? (
        <TouchableOpacity
          style={[styles.button, generating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={generating}
          accessibilityRole="button"
          accessibilityState={{ disabled: generating }}
        >
          <Text style={styles.buttonText}>{generating ? 'Generating…' : `Generate ${wordCount}-word Wallet`}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          {seedVisible ? (
            <>
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>
                  ⏱️ Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timerSubtext}>
                  Seed phrase will be hidden for security • {wordCount} words
                </Text>
              </View>

              <View style={styles.grid}>
                {mnemonic.map((word, idx) => (
                  <View key={idx} style={styles.wordBox} accessibilityLabel={`Word ${idx + 1}`}>
                    <Text style={styles.wordIndex}>{idx + 1}</Text>
                    <Text style={styles.wordText}>{word}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.hiddenBox}>
              <Text style={styles.hiddenIcon}>🔒</Text>
              <Text style={styles.hiddenText}>Seed phrase hidden for security</Text>
              <TouchableOpacity style={styles.showButton} onPress={handleShowSeed}>
                <Text style={styles.showButtonText}>Show Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.checkboxRow}>
            <Switch value={saved} onValueChange={setSaved} />
            <Text style={styles.checkboxLabel}>I've securely saved my seed phrase</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, !saved && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!saved}
            accessibilityRole="button"
            accessibilityState={{ disabled: !saved }}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

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
  description: { fontSize: 16, color: '#666', marginBottom: 24, lineHeight: 22 },
  selectorRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  selectorButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  selectorButtonActive: { backgroundColor: '#E3F2FD', borderColor: '#1976D2' },
  selectorText: { fontSize: 16, color: '#666', fontWeight: '600' },
  selectorTextActive: { color: '#1976D2' },
  warningBox: { backgroundColor: '#FFF3CD', padding: 16, borderRadius: 8, marginBottom: 32 },
  warningTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#856404' },
  warningText: { fontSize: 14, color: '#856404', marginBottom: 4 },
  timerBox: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  timerText: { fontSize: 16, fontWeight: '600', color: '#1976D2', marginBottom: 4 },
  timerSubtext: { fontSize: 12, color: '#1976D2' },
  hiddenBox: { backgroundColor: '#f5f5f5', padding: 48, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  hiddenIcon: { fontSize: 48, marginBottom: 16 },
  hiddenText: { fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' },
  showButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  showButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, marginBottom: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  backButton: { padding: 16 },
  backButtonText: { color: '#007AFF', fontSize: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  wordBox: { width: '30%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 10, alignItems: 'center' },
  wordIndex: { fontSize: 12, color: '#666' },
  wordText: { fontSize: 16, fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  checkboxLabel: { marginLeft: 8, fontSize: 16 },
});
