import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ethers } from 'ethers';

import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useScheduledPayments } from '../features/schedule/store/scheduledSlice';
import { getJobRunner } from '../features/schedule/JobRunner';

type Props = NativeStackScreenProps<any, 'SchedulePayment'>;

const EMOJI_LIST = ['☕️', '🍕', '🍺', '🎉', '🎁', '❤️', '🙏', '💰', '🚀', '🔥'];

export default function SchedulePaymentScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const addPayment = useScheduledPayments((state) => state.addPayment);

  // Step 1: Date & Time
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Step 2: Amount & Recipient
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  // Step 3: Message & Emoji
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  const [saving, setSaving] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Merge selected date with current time
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setScheduledDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Merge current date with selected time
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(selectedEmoji === emoji ? '' : emoji);
  };

  const handleSchedule = async () => {
    // Validation
    if (!ethers.utils.isAddress(recipient)) {
      Alert.alert('Ошибка', 'Введите корректный адрес кошелька');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    const now = new Date();
    if (scheduledDate <= now) {
      Alert.alert('Ошибка', 'Выберите время в будущем');
      return;
    }

    try {
      setSaving(true);

      // Создаём платёж через новый store
      addPayment({
        kind: 'one_time',
        chainId: 11155111, // Sepolia (можно сделать выбор сети)
        asset: {
          type: 'ETH',
        },
        fromAccountId: 'default',
        to: recipient,
        amountHuman: amount,
        scheduleAt: scheduledDate.getTime(),
        note: message || undefined,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // Запускаем JobRunner (он сам проверит, запущен ли уже)
      const jobRunner = getJobRunner();
      jobRunner.start();

      setSaving(false);

      Alert.alert(
        '✅ Платёж запланирован!',
        `${selectedEmoji || '💸'} ${message || 'Платёж'}\n\n` +
          `Сумма: ${amount} ETH\n` +
          `Получатель: ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n` +
          `Когда: ${formatDateTime(scheduledDate)}\n\n` +
          `Деньги будут отправлены автоматически в указанное время.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error scheduling payment:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось запланировать платёж');
      setSaving(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFormValid = () => {
    return (
      ethers.utils.isAddress(recipient) &&
      amount &&
      Number(amount) > 0 &&
      scheduledDate > new Date() &&
      !saving
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Запланировать платёж
            </Text>
            <View style={{ width: 24 }} />
          </View>

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="time" size={40} color={theme.colors.accent} />
            </View>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Отложенный платёж
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Выберите время, сумму и получателя
          </Text>
        </Card>

        {/* Step 1: Date & Time */}
        <Card style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Когда отправить?
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.dateTimeButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            <Text style={[styles.dateTimeText, { color: theme.colors.text }]}>
              {formatDate(scheduledDate)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateTimeButton,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.text} />
            <Text style={[styles.dateTimeText, { color: theme.colors.text }]}>
              {formatTime(scheduledDate)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
            <Ionicons name="information-circle" size={16} color={theme.colors.accent} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Платёж будет отправлен: {formatDateTime(scheduledDate)}
            </Text>
          </View>
        </Card>

        {/* Step 2: Amount & Recipient */}
        <Card style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Сумма и получатель
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Сумма (ETH)</Text>
          <View
            style={[
              styles.amountInputContainer,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>Ξ</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>
            Адрес получателя
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: recipient
                  ? ethers.utils.isAddress(recipient)
                    ? theme.colors.success
                    : theme.colors.error
                  : theme.colors.border,
              },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="0x..."
              placeholderTextColor={theme.colors.textSecondary}
              value={recipient}
              onChangeText={(t) => setRecipient(t.trim())}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {recipient && !ethers.utils.isAddress(recipient) && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Неверный адрес
              </Text>
            </View>
          )}
        </Card>

        {/* Step 3: Message & Emoji */}
        <Card style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Сообщение (опционально)
            </Text>
          </View>

          <TextInput
            style={[
              styles.messageInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="Для чего этот платёж?"
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            maxLength={100}
          />

          <Text style={[styles.emojiTitle, { color: theme.colors.text }]}>
            Выберите emoji
          </Text>

          <View style={styles.emojiGrid}>
            {EMOJI_LIST.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor:
                      selectedEmoji === emoji
                        ? theme.colors.accent + '30'
                        : theme.colors.surface,
                    borderColor:
                      selectedEmoji === emoji ? theme.colors.accent : theme.colors.border,
                  },
                ]}
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Preview */}
        {(message || selectedEmoji) && (
          <Card style={[styles.previewCard, { backgroundColor: theme.colors.accent + '10' }]}>
            <View style={styles.previewHeader}>
              <Ionicons name="eye-outline" size={20} color={theme.colors.accent} />
              <Text style={[styles.previewTitle, { color: theme.colors.text }]}>Предпросмотр</Text>
            </View>
            <Text style={[styles.previewText, { color: theme.colors.text }]}>
              {selectedEmoji} {message || 'Отложенный платёж'}
            </Text>
            <Text style={[styles.previewSubtext, { color: theme.colors.textSecondary }]}>
              Будет отправлен {formatDateTime(scheduledDate)}
            </Text>
          </Card>
        )}

        <Button
          variant="primary"
          onPress={handleSchedule}
          disabled={!isFormValid()}
          style={styles.scheduleButton}
        >
          {saving ? 'Сохранение...' : '⏰ Запланировать платёж'}
        </Button>

        <Button
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Отмена
        </Button>
      </View>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 20,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  emojiTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  previewCard: {
    marginBottom: 16,
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 13,
  },
  scheduleButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 20,
  },
});
