import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { createWalletWithWordCount } from '../services/walletService';
import {
  enableScreenshotProtection,
  disableScreenshotProtection,
  addScreenshotListener
} from '../services/screenshotGuard';
import SafeScreen from '../components/common/SafeScreen';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateWallet'>;

const SEED_DISPLAY_TIMEOUT = 180; // 3 minutes (180 seconds)

export default function CreateWalletScreen({ navigation }: Props) {
  const { theme } = useTheme();
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

  const handleContinue = async () => {
    if (mnemonic.length > 0 && saved) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
      navigation.navigate('Verification' as any, { mnemonic: mnemonic.join(' ') } as any);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeScreen gradient gradientColors={['#0D0D0D', '#1A1A2E']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mnemonic.length === 0 ? (
          <>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              A new wallet will be created with a secure seed phrase. Make sure to write it down and keep it safe.
            </Text>

            {/* Word count selector */}
            <View style={styles.selectorRow} accessibilityRole="radiogroup">
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  wordCount === 12 && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setWordCount(12)}
                accessibilityRole="radio"
                accessibilityState={{ selected: wordCount === 12 }}
              >
                <Text style={[
                  styles.selectorText,
                  { color: wordCount === 12 ? '#FFFFFF' : theme.colors.textSecondary }
                ]}>12 words</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectorButton,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  wordCount === 24 && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setWordCount(24)}
                accessibilityRole="radio"
                accessibilityState={{ selected: wordCount === 24 }}
              >
                <Text style={[
                  styles.selectorText,
                  { color: wordCount === 24 ? '#FFFFFF' : theme.colors.textSecondary }
                ]}>24 words</Text>
              </TouchableOpacity>
            </View>

            {/* Warning Card */}
            <Card style={[styles.warningBox, { backgroundColor: `${theme.colors.warning}15` }]}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={24} color={theme.colors.warning} />
                <Text style={[styles.warningTitle, { color: theme.colors.warning }]}>Important</Text>
              </View>
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                • Never share your seed phrase with anyone
              </Text>
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                • Store it in a secure offline location
              </Text>
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                • You'll need it to recover your wallet
              </Text>
            </Card>

            <Button
              title={generating ? 'Generating...' : `Generate ${wordCount}-word Wallet`}
              variant="primary"
              onPress={handleCreateWallet}
              disabled={generating}
              loading={generating}
              style={styles.generateButton}
            />
          </>
        ) : (
          <>
            {seedVisible ? (
              <>
                {/* Timer */}
                <View style={[styles.timerBox, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <View style={styles.timerRow}>
                    <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                    <Text style={[styles.timerText, { color: theme.colors.primary }]}>
                      {formatTime(timeLeft)}
                    </Text>
                  </View>
                  <Text style={[styles.timerSubtext, { color: theme.colors.textSecondary }]}>
                    Seed phrase will be hidden for security
                  </Text>
                </View>

                {/* Seed Grid - 2 columns layout like Trust Wallet */}
                <View style={styles.seedContainer}>
                  {/* Left column: words 1-12 */}
                  <View style={styles.seedColumn}>
                    {mnemonic.slice(0, Math.ceil(mnemonic.length / 2)).map((word, idx) => (
                      <View 
                        key={idx} 
                        style={styles.wordRow}
                        accessibilityLabel={`Word ${idx + 1}: ${word}`}
                      >
                        <Text style={[styles.wordNumber, { color: theme.colors.muted }]}>{idx + 1}.</Text>
                        <Text style={[styles.wordText, { color: theme.colors.text }]}>{word}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Right column: words 13-24 (or 7-12 for 12-word) */}
                  <View style={styles.seedColumn}>
                    {mnemonic.slice(Math.ceil(mnemonic.length / 2)).map((word, idx) => {
                      const wordIndex = Math.ceil(mnemonic.length / 2) + idx + 1;
                      return (
                        <View 
                          key={idx} 
                          style={styles.wordRow}
                          accessibilityLabel={`Word ${wordIndex}: ${word}`}
                        >
                          <Text style={[styles.wordNumber, { color: theme.colors.muted }]}>{wordIndex}.</Text>
                          <Text style={[styles.wordText, { color: theme.colors.text }]}>{word}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.hiddenBox, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="lock-closed" size={48} color={theme.colors.muted} />
                <Text style={[styles.hiddenText, { color: theme.colors.textSecondary }]}>
                  Seed phrase hidden for security
                </Text>
                <Button
                  title="Show Again"
                  variant="outline"
                  onPress={handleShowSeed}
                  style={styles.showButton}
                />
              </View>
            )}

            {/* Confirmation */}
            <View style={styles.checkboxRow}>
              <Switch 
                value={saved} 
                onValueChange={setSaved}
                trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                thumbColor={saved ? '#FFFFFF' : theme.colors.muted}
              />
              <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                I've securely saved my seed phrase
              </Text>
            </View>

            <Button
              title="Continue"
              variant="primary"
              onPress={handleContinue}
              disabled={!saved}
              style={styles.continueButton}
            />
          </>
        )}
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
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  selectorButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningBox: {
    marginBottom: 24,
    borderWidth: 0,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 8,
  },
  generateButton: {
    marginTop: 8,
  },
  timerBox: {
    padding: 14,
    borderRadius: 6,
    marginBottom: 20,
    alignItems: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1,
  },
  timerSubtext: {
    fontSize: 13,
  },
  seedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  seedColumn: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  wordNumber: {
    fontSize: 14,
    width: 28,
    textAlign: 'right',
    marginRight: 8,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  hiddenBox: {
    padding: 40,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  hiddenText: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  showButton: {
    paddingHorizontal: 32,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  continueButton: {
    marginTop: 8,
  },
});
