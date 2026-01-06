import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { sendETH, estimateGas } from '../services/blockchain/transactionService';
import { getSelectedNetwork } from '../services/networkService';
import type { Network } from '../config/env';
import {
  savePendingPayment,
  createPendingPaymentFromLink,
  markAsPaid,
  PendingPayment,
} from '../services/pendingPaymentsService';

type Props = NativeStackScreenProps<any, 'PaySplitBill'>;

export default function PaySplitBillScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  // Parse parameters from deep link
  const { to, amount, total, participants } = route.params as {
    to: string;
    amount: string;
    total?: string;
    participants?: string;
  };

  const [estimatedGas, setEstimatedGas] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string>('');
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

  useEffect(() => {
    getSelectedNetwork().then(setCurrentNetwork);
  }, []);

  useEffect(() => {
    loadGasEstimate();
  }, [to, amount, currentNetwork]);

  const loadGasEstimate = async () => {
    try {
      if (!to || !amount) return;
      const gasLimit = await estimateGas(to, amount, currentNetwork);
      setEstimatedGas(gasLimit.toString());
    } catch (error) {
      console.error('Error estimating gas:', error);
    }
  };

  const handlePayNow = async () => {
    if (!activeAccount) {
      Alert.alert('Ошибка', 'Кошелёк не найден');
      return;
    }

    if (!to || !amount) {
      Alert.alert('Ошибка', 'Неверные параметры платежа');
      return;
    }

    Alert.alert(
      'Подтвердить оплату',
      `Вы уверены, что хотите отправить ${amount} ETH на адрес ${to.slice(0, 6)}...${to.slice(-4)}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Оплатить',
          onPress: async () => {
            try {
              setLoading(true);

              const txHash = await sendETH(to, amount, currentNetwork);
              console.log('Transaction sent:', txHash);

              // Mark as paid if it was saved as pending
              if (pendingPaymentId) {
                await markAsPaid(pendingPaymentId);
              }

              Alert.alert('Успех!', `Платёж отправлен!\nHash: ${txHash.slice(0, 10)}...`, [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
              ]);
            } catch (error: any) {
              console.error('Payment error:', error);
              Alert.alert('Ошибка', error.message || 'Не удалось отправить платёж');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveForLater = async () => {
    if (!activeAccount) {
      Alert.alert('Ошибка', 'Кошелёк не найден');
      return;
    }

    try {
      setSaving(true);

      const payment = createPendingPaymentFromLink(
        to,
        amount,
        total || amount,
        parseInt(participants || '1'),
        activeAccount.address
      );

      await savePendingPayment(payment);
      setPendingPaymentId(payment.id);

      Alert.alert(
        'Сохранено',
        'Платёж сохранён в разделе "Ожидающие платежи". Вы получите напоминание.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить платёж');
    } finally {
      setSaving(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Запрос на оплату</Text>
          <View style={{ width: 24 }} />
        </View>

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="receipt" size={48} color={theme.colors.primary} />
            </View>
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Кто-то просит вас оплатить часть счёта
          </Text>

          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: theme.colors.text }]}>{amount} ETH</Text>
          </View>

          {total && participants && (
            <Text style={[styles.subtext, { color: theme.colors.textSecondary }]}>
              из общего счёта {total} ETH (на {participants} человек)
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Получатель:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {truncateAddress(to)}
            </Text>
          </View>

          {activeAccount && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Ваш адрес:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {truncateAddress(activeAccount.address)}
              </Text>
            </View>
          )}

          {estimatedGas && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                ~Gas:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {estimatedGas}
              </Text>
            </View>
          )}
        </Card>

        <Card style={[styles.infoCard, { backgroundColor: theme.colors.primary + '10' }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Вы можете оплатить сейчас или сохранить напоминание и оплатить позже
            </Text>
          </View>
        </Card>

        <Button
          variant="primary"
          onPress={handlePayNow}
          disabled={loading || saving || !activeAccount}
        >
          {loading ? 'Отправка...' : 'Оплатить сейчас'}
        </Button>

        <Button
          variant="outline"
          onPress={handleSaveForLater}
          disabled={loading || saving || !activeAccount}
          style={styles.saveButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить на потом'}
        </Button>

        <Button
          variant="outline"
          onPress={() => navigation.navigate('Home')}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 40,
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
  label: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: '500',
  },
  subtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoCard: {
    marginBottom: 24,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 8,
  },
});
