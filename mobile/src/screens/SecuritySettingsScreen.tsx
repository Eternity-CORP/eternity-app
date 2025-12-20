import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import SafeScreen from '../components/common/SafeScreen';
import Card from '../components/common/Card';
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from '../services/biometricService';
import { isPinSet, setPin, clearPin } from '../services/pinService';

type Props = NativeStackScreenProps<MainStackParamList, 'SecuritySettings'>;

export default function SecuritySettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [pin1, setPin1State] = useState('');
  const [pin2, setPin2State] = useState('');
  const [pinSet, setPinSet] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      setPinSet(await isPinSet());
      setBioAvailable(await isBiometricAvailable());
      setBioEnabled(await isBiometricEnabled());
    };
    load();
  }, []);

  const handleSetPin = async () => {
    if (pin1.length < 4 || pin2.length < 4) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 4 символа');
      return;
    }

    // Validate alphanumeric
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(pin1)) {
      Alert.alert('Ошибка', 'Пароль может содержать только буквы и цифры');
      return;
    }

    if (pin1 !== pin2) {
      Alert.alert('Ошибка', 'Пароль и подтверждение не совпадают');
      return;
    }
    try {
      await setPin(pin1);
      setPin1State('');
      setPin2State('');
      setPinSet(true);
      Alert.alert('Готово', 'Пароль установлен');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось установить пароль');
    }
  };

  const handleClearPin = async () => {
    await clearPin();
    setPinSet(false);
    Alert.alert('Готово', 'Пароль удален');
  };

  const handleToggleBiometric = async () => {
    if (!bioAvailable) {
      Alert.alert('Недоступно', 'Биометрия не поддерживается или не настроена');
      return;
    }
    await setBiometricEnabled(!bioEnabled);
    setBioEnabled(!bioEnabled);
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Пароль</Text>
        {pinSet ? (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error }]} onPress={handleClearPin}>
            <Text style={styles.actionText}>Удалить пароль</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={pin1}
              onChangeText={setPin1State}
              placeholder="Введите пароль (буквы или цифры)"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
              value={pin2}
              onChangeText={setPin2State}
              placeholder="Подтвердите пароль"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
            />
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={handleSetPin}>
              <Text style={styles.actionText}>Установить пароль</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Биометрия</Text>
        <View style={styles.row}>
          <Text style={{ color: theme.colors.muted }}>{bioAvailable ? 'Доступна' : 'Недоступна'}</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: bioEnabled ? theme.colors.error : theme.colors.primary }]}
            onPress={handleToggleBiometric}
          >
            <Text style={styles.actionText}>{bioEnabled ? 'Отключить' : 'Включить'}</Text>
          </TouchableOpacity>
        </View>
        </Card>
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

