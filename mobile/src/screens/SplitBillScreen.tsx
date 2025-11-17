import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import {
  createSplitBill,
  saveSplitBill,
  calculateEqualSplit,
  validateCustomSplit,
} from '../services/splitBillService';
import { SplitBill, SplitBillParticipant, SplitMode } from '../types/splitBill.types';
import { useShardAnimation } from '../features/shards/ShardAnimationProvider';
import { reportSplitBillShard } from '../services/shardEventsService';

type Props = NativeStackScreenProps<any, 'SplitBill'>;

export default function SplitBillScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const { triggerShardAnimation } = useShardAnimation();

  const [totalAmount, setTotalAmount] = useState('');
  const [participantsCount, setParticipantsCount] = useState('2');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [participants, setParticipants] = useState<SplitBillParticipant[]>([]);
  const [shareableLink, setShareableLink] = useState('');

  // Initialize participants when count or mode changes
  useEffect(() => {
    const count = parseInt(participantsCount) || 0;
    if (count > 0 && totalAmount && activeAccount) {
      const bill = createSplitBill(totalAmount, count, activeAccount.address, splitMode);
      setParticipants(bill.participants);
      setShareableLink(bill.shareableLink || '');
    }
  }, [participantsCount, totalAmount, splitMode, activeAccount]);

  const handleSwitchMode = (isCustom: boolean) => {
    setSplitMode(isCustom ? 'custom' : 'equal');
  };

  const handleParticipantAmountChange = (index: number, amount: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], amount };
    setParticipants(updated);
  };

  const handleParticipantAddressChange = (index: number, address: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], address };
    setParticipants(updated);
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      await Clipboard.setStringAsync(shareableLink);
      Alert.alert('Успех', 'Ссылка скопирована в буфер обмена!');
    }
  };

  const handleSave = async () => {
    if (!activeAccount) {
      Alert.alert('Ошибка', 'Аккаунт не найден');
      return;
    }

    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }

    const count = parseInt(participantsCount);
    if (isNaN(count) || count < 1) {
      Alert.alert('Ошибка', 'Количество участников должно быть больше 0');
      return;
    }

    if (splitMode === 'custom') {
      if (!validateCustomSplit(totalAmount, participants)) {
        Alert.alert(
          'Ошибка',
          'Сумма всех участников должна равняться общей сумме счёта'
        );
        return;
      }
    }

    try {
      const bill: SplitBill = {
        id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalAmount,
        currency: 'ETH',
        mode: splitMode,
        participants,
        creatorAddress: activeAccount.address,
        status: 'draft',
        createdAt: Date.now(),
        shareableLink,
      };

      await saveSplitBill(bill);

      // Сообщаем на backend о создании split bill, чтобы начислить шарды
      try {
        const creatorAddress = activeAccount.address;
        const shardResult = await reportSplitBillShard({
          walletAddress: creatorAddress,
          totalAmount,
          participantsCount: participants.length,
        });

        const earned = shardResult?.earnedShards ?? 0;
        if (earned > 0) {
          triggerShardAnimation(earned);
        } else if (
          shardResult?.limitReason === 'DAILY_LIMIT' ||
          shardResult?.limitReason === 'DEVICE_LIMIT'
        ) {
          Alert.alert(
            'Лимит шардов',
            'На сегодня дневной лимит шардов достигнут. Действие всё равно выполнено, но новые шарды будут начислены завтра.',
          );
        }
      } catch (error) {
        console.warn('[SplitBillScreen] Failed to report shard event:', error);
        triggerShardAnimation(1);
      }

      Alert.alert('Успех', 'Счёт сохранён! Теперь вы можете поделиться ссылкой.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error saving split bill:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить счёт');
    }
  };

  const getTotalCustom = () => {
    return participants.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0).toFixed(6);
  };

  const isCustomValid = () => {
    if (splitMode === 'custom') {
      return validateCustomSplit(totalAmount, participants);
    }
    return true;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Разделить счёт</Text>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Общая сумма (ETH)</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={totalAmount}
            onChangeText={setTotalAmount}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Количество участников</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            placeholder="2"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
            value={participantsCount}
            onChangeText={setParticipantsCount}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.label, { color: theme.colors.text }]}>Режим деления</Text>
              <Text style={[styles.subLabel, { color: theme.colors.textSecondary }]}>
                {splitMode === 'equal' ? 'Поровну' : 'Кастомное'}
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>
                Поровну
              </Text>
              <Switch
                value={splitMode === 'custom'}
                onValueChange={handleSwitchMode}
                trackColor={{ false: theme.colors.textSecondary, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
              <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>
                Кастомное
              </Text>
            </View>
          </View>
        </Card>

        {participants.length > 0 && (
          <Card style={styles.card}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Участники {splitMode === 'custom' && `(Итого: ${getTotalCustom()} ETH)`}
            </Text>
            {!isCustomValid() && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Сумма не совпадает с общей суммой!
              </Text>
            )}
            {participants.map((participant, index) => (
              <View key={participant.id} style={styles.participantRow}>
                <Text style={[styles.participantNumber, { color: theme.colors.textSecondary }]}>
                  #{index + 1}
                </Text>
                <View style={styles.participantInput}>
                  {splitMode === 'equal' ? (
                    <View style={[styles.amountDisplay, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.amountText, { color: theme.colors.text }]}>
                        {participant.amount} ETH
                      </Text>
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      }]}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={participant.amount}
                      onChangeText={(text) => handleParticipantAmountChange(index, text)}
                    />
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}

        {shareableLink && (
          <Card style={styles.card}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Ссылка для друзей</Text>
            <TouchableOpacity
              style={[styles.linkContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              onPress={handleCopyLink}
            >
              <Text
                style={[styles.linkText, { color: theme.colors.primary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {shareableLink}
              </Text>
              <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Нажмите, чтобы скопировать и отправить друзьям
            </Text>
          </Card>
        )}

        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!isCustomValid() || !totalAmount || participants.length === 0}
        >
          Сохранить счёт
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  participantNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    width: 30,
  },
  participantInput: {
    flex: 1,
  },
  amountDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    borderColor: 'transparent',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
  },
});
