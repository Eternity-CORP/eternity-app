import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { verifyPin, getLockoutInfo } from '../services/pinService';
import { isBiometricAvailable, authenticateWithBiometrics } from '../services/biometricService';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

interface PinAuthScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function PinAuthScreen({ onSuccess, onCancel }: PinAuthScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setBiometricSupported(await isBiometricAvailable());
      const info = await getLockoutInfo();
      if (info.locked) setLockoutRemaining(Math.ceil(info.remainingMs / 1000));
    })();
    const interval = setInterval(async () => {
      const info = await getLockoutInfo();
      if (!info.locked) {
        setLockoutRemaining(0);
        clearInterval(interval);
      } else {
        setLockoutRemaining(Math.ceil(info.remainingMs / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (pin.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      return;
    }

    // Validate alphanumeric
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(pin)) {
      setError('Пароль может содержать только буквы и цифры');
      return;
    }

    const res = await verifyPin(pin);
    if (res.success) {
      setPin('');
      onSuccess();
      return;
    }
    if (res.locked) {
      setError('Слишком много попыток. Повторите позже.');
      const info = await getLockoutInfo();
      setLockoutRemaining(Math.ceil(info.remainingMs / 1000));
      setPin('');
      return;
    }
    setError('Неверный пароль.');
    setPin('');
  };

  const handleBiometric = async () => {
    const result = await authenticateWithBiometrics('Авторизация для доступа');
    if (result.success) {
      onSuccess();
    } else {
      Alert.alert('Ошибка', result.error || 'Не удалось выполнить биометрическую проверку');
    }
  };

  return (
    <KeyboardAwareScreen 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      withSafeArea={false}
    >
      <Text style={styles.title}>Введите пароль</Text>
      {lockoutRemaining > 0 && (
        <Text style={styles.lockoutText}>Блокировка: {lockoutRemaining}s</Text>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="Пароль (буквы или цифры)"
        placeholderTextColor="#666"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={lockoutRemaining === 0}
        maxLength={32}
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[styles.submitButton, lockoutRemaining > 0 && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={lockoutRemaining > 0}
      >
        <Text style={styles.submitButtonText}>Войти</Text>
      </TouchableOpacity>

      {biometricSupported && (
        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
          <Text style={styles.biometricButtonText}>Использовать биометрию</Text>
        </TouchableOpacity>
      )}

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
      )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F28' },
  contentContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, color: '#fff', fontWeight: 'bold', marginBottom: 16 },
  errorText: { color: '#FF3B30', marginBottom: 12 },
  lockoutText: { color: '#FF9500', marginBottom: 12 },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#1C2140',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  submitButton: {
    width: '100%',
    maxWidth: 320,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#555',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#28A745' },
  biometricButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { marginTop: 12 },
  cancelText: { color: '#999' },
});

