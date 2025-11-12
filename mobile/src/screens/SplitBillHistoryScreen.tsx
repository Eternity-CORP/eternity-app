import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { getSplitBillHistory, deleteSplitBill } from '../services/splitBillService';
import { SplitBill } from '../types/splitBill.types';

type Props = NativeStackScreenProps<any, 'SplitBillHistory'>;

export default function SplitBillHistoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [bills, setBills] = useState<SplitBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await getSplitBillHistory();
      setBills(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить счёт?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSplitBill(id);
            await loadHistory();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить счёт');
          }
        },
      },
    ]);
  };

  const handleCopyLink = async (link: string) => {
    await Clipboard.setStringAsync(link);
    Alert.alert('Успех', 'Ссылка скопирована!');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBillItem = ({ item }: { item: SplitBill }) => (
    <Card style={styles.billCard}>
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={[styles.billAmount, { color: theme.colors.text }]}>
            {item.totalAmount} ETH
          </Text>
          <Text style={[styles.billDate, { color: theme.colors.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.billDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {item.participants.length} участников
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons
            name={item.mode === 'equal' ? 'git-compare-outline' : 'create-outline'}
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {item.mode === 'equal' ? 'Поровну' : 'Кастомное'}
          </Text>
        </View>
      </View>

      {item.shareableLink && (
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: theme.colors.background }]}
          onPress={() => handleCopyLink(item.shareableLink!)}
        >
          <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.linkButtonText, { color: theme.colors.primary }]}>
            Скопировать ссылку
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        Здесь пока нет разделённых счетов
      </Text>
      <Button
        variant="primary"
        onPress={() => navigation.navigate('SplitBill')}
        style={styles.createButton}
      >
        Создать первый счёт
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  billCard: {
    marginBottom: 16,
    padding: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billInfo: {
    flex: 1,
  },
  billAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 12,
  },
  billDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: 32,
  },
});
