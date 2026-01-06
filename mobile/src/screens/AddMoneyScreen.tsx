import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

type Props = NativeStackScreenProps<any, 'AddMoney'>;

const PRESET_AMOUNTS = [
  { label: '$50', value: 50 },
  { label: '$100', value: 100 },
  { label: '$250', value: 250 },
  { label: '$500', value: 500 },
];

export default function AddMoneyScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  const [selectedPreset, setSelectedPreset] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (value: number) => {
    setSelectedPreset(value);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomInput = (text: string) => {
    setCustomAmount(text);
    setSelectedPreset(null);
    setIsCustom(true);
  };

  const getFinalAmount = (): number => {
    if (isCustom && customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedPreset || 0;
  };

  const handleContinue = () => {
    const amount = getFinalAmount();

    if (amount < 20) {
      Alert.alert('Ошибка', 'Минимальная сумма для покупки: $20');
      return;
    }

    if (amount > 10000) {
      Alert.alert('Ошибка', 'Максимальная сумма для покупки: $10,000');
      return;
    }

    if (!activeAccount) {
      Alert.alert('Ошибка', 'Кошелёк не найден');
      return;
    }

    // Navigate to Transak widget
    navigation.navigate('TransakWidget', {
      amount: amount.toString(),
      walletAddress: activeAccount.address,
    });
  };

  return (
    <KeyboardAwareScreen 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      withSafeArea={true}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Добавить деньги</Text>
        <View style={{ width: 24 }} />
      </View>

      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.success + '20' }]}>
            <Ionicons name="add-circle" size={48} color={theme.colors.success} />
          </View>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          Купите криптовалюту с помощью карты
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Поддерживается Apple Pay, Google Pay и банковские карты
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Выберите сумму
        </Text>

        <View style={styles.presetGrid}>
          {PRESET_AMOUNTS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.presetButton,
                {
                  backgroundColor:
                    selectedPreset === preset.value
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor:
                    selectedPreset === preset.value
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
              onPress={() => handlePresetSelect(preset.value)}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color:
                      selectedPreset === preset.value
                        ? '#FFFFFF'
                        : theme.colors.text,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>или</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Введите свою сумму
        </Text>
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: isCustom ? theme.colors.primary : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={handleCustomInput}
          />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Минимум: $20 • Максимум: $10,000
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Вы получите</Text>

        <View style={styles.receiveRow}>
          <View>
            <Text style={[styles.receiveAmount, { color: theme.colors.text }]}>
              ~{(getFinalAmount() * 0.99).toFixed(2)} USDC
            </Text>
            <Text style={[styles.receiveSubtext, { color: theme.colors.textSecondary }]}>
              ~{getFinalAmount() > 0 ? (getFinalAmount() / 1).toFixed(2) : '0.00'} USD
            </Text>
          </View>
          <View style={[styles.tokenBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.tokenText, { color: theme.colors.primary }]}>USDC</Text>
          </View>
        </View>

        <View style={styles.feeRow}>
          <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>
            Комиссия сервиса (~1%)
          </Text>
          <Text style={[styles.feeValue, { color: theme.colors.textSecondary }]}>
            ${(getFinalAmount() * 0.01).toFixed(2)}
          </Text>
        </View>
      </Card>

      <Card style={[styles.infoCard, { backgroundColor: theme.colors.primary + '10' }]}>
        <View style={styles.infoCardRow}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardTitle, { color: theme.colors.text }]}>
              Безопасно и быстро
            </Text>
            <Text style={[styles.infoCardText, { color: theme.colors.textSecondary }]}>
              • KYC требуется только при первой покупке{'\n'}
              • Средства поступят через 2-5 минут{'\n'}
              • Поддержка Apple Pay, Google Pay, карты
            </Text>
          </View>
        </View>
      </Card>

      <Button
        variant="primary"
        onPress={handleContinue}
        disabled={getFinalAmount() === 0}
        style={styles.continueButton}
      >
        Продолжить
      </Button>

      <Button
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
      >
        Отмена
      </Button>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginBottom: 16,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  presetButton: {
    width: '47%',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
  },
  receiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiveAmount: {
    fontSize: 20,
    fontWeight: '500',
  },
  receiveSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  tokenBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  tokenText: {
    fontSize: 12,
    fontWeight: '500',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: 24,
    padding: 16,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoCardText: {
    fontSize: 13,
    lineHeight: 20,
  },
  continueButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
