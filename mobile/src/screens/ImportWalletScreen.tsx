import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { ethers } from 'ethers';
import { importWallet, initializeWallet } from '../services/walletService';
import { saveWallet, isWalletExists } from '../services/cryptoService';
import { validateSeedPhrase, quickValidate, ValidationResult } from '../services/seedValidator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen({ navigation }: Props) {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showQuickFeedback, setShowQuickFeedback] = useState(false);
  const [selectedCount, setSelectedCount] = useState<12 | 24>(12);

  const wordCount = useMemo(() => {
    return seedPhrase.trim().length === 0 ? 0 : seedPhrase.trim().split(/\s+/).length;
  }, [seedPhrase]);

  const isWordCountValid = wordCount === selectedCount;

  const handleImportWallet = async () => {
    // Run full validation
    // Enforce strict count before full validation
    const trimmed = seedPhrase.trim();
    const words = trimmed ? trimmed.split(/\s+/) : [];
    if (words.length !== selectedCount) {
      setValidationResult({
        valid: false,
        errors: [{
          type: 'INVALID_WORD_COUNT',
          message: `Invalid word count: ${words.length}. Expected exactly ${selectedCount}.`,
          messageRu: `Неверное количество слов: ${words.length}. Ожидается ровно ${selectedCount}.`,
        }],
      });
      return;
    }

    const validation = validateSeedPhrase(seedPhrase);
    setValidationResult(validation);

    if (!validation.valid) {
      // Validation errors will be displayed in the UI
      return;
    }

    try {
      setLoading(true);
      // Use normalized mnemonic from validation
      const normalizedSeed = validation.normalized!;
      const wallet = await importWallet(normalizedSeed);
      await saveWallet(normalizedSeed, wallet.privateKey);

      // Initialize wallet metadata and create first account
      await initializeWallet();

      // Ensure storage reflects wallet existence before navigation (robustness on web/native)
      // Try a short poll to avoid race conditions with SecureStore/localStorage
      let confirmed = await isWalletExists();
      if (!confirmed) {
        for (let i = 0; i < 3; i++) {
          await new Promise(res => setTimeout(res, 150));
          if (await isWalletExists()) { confirmed = true; break; }
        }
      }

      // Wallet is now created, RootNavigator will automatically switch to MainNavigator
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });

      // Fallback: if root switch lags, navigate to Home within Auth to show immediate state
      // RootNavigator will still swap to MainNavigator when it detects the wallet
      if (!confirmed) {
        try { navigation.navigate('Home' as any); } catch {}
      }
    } catch (e) {
      // Do not log error - may contain seed phrase
      setValidationResult({
        valid: false,
        errors: [{
          type: 'INVALID_WORD',
          message: 'Failed to import wallet. Please try again.',
          messageRu: 'Не удалось импортировать кошелёк. Попробуйте снова.',
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time validation feedback (quick validation only)
  useEffect(() => {
    if (loading) return;
    const trimmed = seedPhrase.trim();

    if (!trimmed) {
      setValidationResult(null);
      setShowQuickFeedback(false);
      return;
    }

    const timer = setTimeout(() => {
      const quick = quickValidate(trimmed);
      setShowQuickFeedback(true);

      // Only run full validation if word count is correct
      if (quick.valid) {
        const words = trimmed.split(/\s+/);
        if (words.length === selectedCount) {
          const fullValidation = validateSeedPhrase(trimmed);
          setValidationResult(fullValidation);

          // Auto-import if valid
          if (fullValidation.valid) {
            handleImportWallet();
          }
        }
      } else {
        // Show quick validation feedback
        setValidationResult({
          valid: false,
          errors: [{
            type: 'INVALID_WORD_COUNT',
            message: quick.message ? `${quick.message} (expected ${selectedCount})` : `Expected exactly ${selectedCount} words`,
            messageRu: quick.messageRu ? `${quick.messageRu} (ожидается ${selectedCount})` : `Ожидается ровно ${selectedCount} слов`,
          }],
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [seedPhrase, loading]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Импорт Кошелька</Text>
      <Text style={styles.description}>
        Введите сид-фразу для восстановления кошелька
      </Text>

      {/* Переключатель количества слов */}
      <View style={styles.selectorRow} accessibilityRole="radiogroup">
        <TouchableOpacity
          style={[styles.selectorButton, selectedCount === 12 && styles.selectorButtonActive]}
          onPress={() => setSelectedCount(12)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedCount === 12 }}
        >
          <Text style={[styles.selectorText, selectedCount === 12 && styles.selectorTextActive]}>12 слов</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, selectedCount === 24 && styles.selectorButtonActive]}
          onPress={() => setSelectedCount(24)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedCount === 24 }}
        >
          <Text style={[styles.selectorText, selectedCount === 24 && styles.selectorTextActive]}>24 слова</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Сид-фраза (ровно {selectedCount} слов)</Text>
      <TextInput
        style={[
          styles.input,
          validationResult && !validationResult.valid && showQuickFeedback && styles.inputError,
          validationResult?.valid && styles.inputSuccess,
        ]}
        placeholder="Введите сид-фразу"
        placeholderTextColor="#999"
        value={seedPhrase}
        onChangeText={(t: string) => {
          setSeedPhrase(t);
          setShowQuickFeedback(false);
        }}
        multiline={true}
        numberOfLines={4}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
        accessibilityLabel="Seed phrase input"
      />

      <View style={styles.validationRow}>
        <Text style={styles.counterText}>Слов: {wordCount}</Text>
        <Text style={[styles.statusText, isWordCountValid ? styles.statusOk : styles.statusWarn]}>
          {isWordCountValid ? '✓ Длина ОК' : `Нужно ровно ${selectedCount} слов`}
        </Text>
      </View>

      {/* Validation Errors */}
      {validationResult && !validationResult.valid && showQuickFeedback && (
        <View style={styles.errorBox} accessibilityRole="alert">
          {validationResult.errors.map((err, idx) => (
            <View key={idx} style={styles.errorItem}>
              <Text style={styles.errorText}>• {err.messageRu}</Text>
              {err.type === 'WRONG_KEYBOARD_LAYOUT' && (
                <Text style={styles.errorHint}>
                  💡 Возможно, вы печатали в русской раскладке
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Suggestions for typos */}
      {validationResult?.suggestions && Object.keys(validationResult.suggestions).length > 0 && (
        <View style={styles.suggestionsBox}>
          <Text style={styles.suggestionsTitle}>💡 Возможно, вы имели в виду:</Text>
          {Object.entries(validationResult.suggestions).map(([wordIndex, suggestions]) => {
            const words = seedPhrase.trim().split(/\s+/);
            const invalidWord = words[parseInt(wordIndex)];
            return (
              <View key={wordIndex} style={styles.suggestionItem}>
                <Text style={styles.suggestionLabel}>
                  Слово #{parseInt(wordIndex) + 1} "{invalidWord}":
                </Text>
                <View style={styles.suggestionButtons}>
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionButton}
                      onPress={() => {
                        const newWords = [...words];
                        newWords[parseInt(wordIndex)] = suggestion;
                        setSeedPhrase(newWords.join(' '));
                      }}
                    >
                      <Text style={styles.suggestionButtonText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Success indicator */}
      {validationResult?.valid && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ Сид-фраза валидна</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (!seedPhrase || loading) && styles.buttonDisabled]}
        onPress={handleImportWallet}
        disabled={!seedPhrase || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: !seedPhrase || loading }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Импортировать Кошелёк</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📝 Подсказки:</Text>
        <Text style={styles.infoText}>• Разделяйте слова пробелами</Text>
        <Text style={styles.infoText}>• Проверьте правильность написания</Text>
        <Text style={styles.infoText}>• Порядок слов важен</Text>
        <Text style={styles.infoText}>• Можно вставить с пунктуацией - она будет удалена</Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>Назад</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Импорт кошелька…</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  inputSuccess: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8F4',
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterText: {
    fontSize: 14,
    color: '#666',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusOk: {
    color: '#2E7D32',
  },
  statusWarn: {
    color: '#D32F2F',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorItem: {
    marginBottom: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    lineHeight: 20,
  },
  errorHint: {
    color: '#E65100',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12,
  },
  suggestionItem: {
    marginBottom: 12,
  },
  suggestionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  suggestionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  suggestionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  // selector styles
  selectorRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  selectorButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  selectorButtonActive: { backgroundColor: '#E3F2FD', borderColor: '#1976D2' },
  selectorText: { fontSize: 16, color: '#666', fontWeight: '600' },
  selectorTextActive: { color: '#1976D2' },
});
