import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { MainStackParamList } from '../../navigation/MainNavigator';
import Card from '../../components/common/Card';
import { useWalletPreferences } from '../../hooks/useWalletPreferences';
import { getChainInfo } from '../../constants/chains';

type Props = NativeStackScreenProps<MainStackParamList, 'ManageNetworks'>;

export default function ManageNetworksScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    wallets,
    primaryChainId,
    loading,
    error,
    toggleNetwork,
    setPrimary
  } = useWalletPreferences();

  const [toggling, setToggling] = useState<number | null>(null);

  const handleToggle = async (walletId: number, currentlyActive: boolean) => {
    try {
      setToggling(walletId);
      await toggleNetwork(walletId, currentlyActive);
    } catch (err: any) {
      Alert.alert(
        'Ошибка / Error',
        err.message || 'Failed to toggle network / Не удалось переключить сеть'
      );
    } finally {
      setToggling(null);
    }
  };

  const handleSetPrimary = async (walletId: number, chainId: string, isActive: boolean) => {
    if (!isActive) {
      Alert.alert(
        'Нельзя установить / Cannot Set Primary',
        'Сначала включите эту сеть / Enable this network first before setting it as primary.'
      );
      return;
    }

    Alert.alert(
      'Установить основную сеть / Set Primary Network',
      `Установить ${chainId} как основную сеть? / Set ${chainId} as your primary network?`,
      [
        { text: 'Отмена / Cancel', style: 'cancel' },
        {
          text: 'Установить / Set Primary',
          onPress: async () => {
            try {
              await setPrimary(walletId);
            } catch (err: any) {
              Alert.alert('Ошибка / Error', err.message);
            }
          },
        },
      ]
    );
  };

  const getChainDisplayInfo = (chainId: string) => {
    const info = getChainInfo(chainId);
    return info || { icon: '🔗', name: chainId, color: '#666666' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Управление сетями{'\n'}Manage Networks
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <Card style={styles.infoCard}>
            <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Включите сети, которые хотите использовать. Установите одну как основную для адресов получения по умолчанию.{'\n\n'}
                Enable networks you want to use. Set one as primary for default receive addresses.
              </Text>
            </View>
          </Card>

          {/* Primary Network Section */}
          {primaryChainId && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Основная сеть / Primary Network
              </Text>
              <Card style={styles.primaryCard}>
                <View style={styles.primaryBadge}>
                  <Ionicons name="star" size={20} color={theme.colors.warning} />
                  <Text style={[styles.primaryText, { color: theme.colors.warning }]}>
                    {getChainDisplayInfo(primaryChainId).name}
                  </Text>
                </View>
                <Text style={[styles.primaryHint, { color: theme.colors.textSecondary }]}>
                  Эта сеть используется по умолчанию для получения платежей{'\n'}
                  This network is used by default for receiving payments
                </Text>
              </Card>
            </View>
          )}

          {/* Networks List */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Доступные сети / Available Networks
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Переключайте сети и устанавливайте основную{'\n'}
              Toggle networks on/off and set primary
            </Text>

            {wallets.map((wallet, index) => {
              const chainInfo = getChainDisplayInfo(wallet.chainId);
              const isPrimary = wallet.chainId === primaryChainId;
              const isToggling = toggling === wallet.id;

              return (
                <Card key={wallet.id} style={[styles.networkCard, index === 0 && styles.firstCard]}>
                  <View style={styles.networkRow}>
                    <View style={styles.networkLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                        <Text style={styles.networkIcon}>{chainInfo.icon}</Text>
                      </View>
                      <View style={styles.networkInfo}>
                        <View style={styles.networkNameRow}>
                          <Text style={[styles.networkName, { color: theme.colors.text }]}>
                            {chainInfo.name}
                          </Text>
                          {isPrimary && (
                            <View style={[styles.badge, { backgroundColor: theme.colors.warning + '20' }]}>
                              <Ionicons name="star" size={12} color={theme.colors.warning} />
                              <Text style={[styles.badgeText, { color: theme.colors.warning }]}>Primary</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.networkChainId, { color: theme.colors.textSecondary }]}>
                          {wallet.chainId}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.networkActions}>
                      {isToggling ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Switch
                          value={wallet.isActive}
                          onValueChange={() => handleToggle(wallet.id, wallet.isActive)}
                          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                          thumbColor={wallet.isActive ? theme.colors.primary : '#FFFFFF'}
                          ios_backgroundColor={theme.colors.border}
                        />
                      )}
                      {!isPrimary && wallet.isActive && (
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: theme.colors.warning + '15' }]}
                          onPress={() => handleSetPrimary(wallet.id, wallet.chainId, wallet.isActive)}
                        >
                          <Ionicons name="star-outline" size={18} color={theme.colors.warning} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  infoCard: { marginHorizontal: 16, marginBottom: 16, padding: 16 },
  infoBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryCard: { padding: 16 },
  primaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  primaryHint: { fontSize: 13, lineHeight: 18 },
  networkCard: { marginBottom: 8, padding: 16 },
  firstCard: { marginTop: 0 },
  networkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  networkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  networkIcon: { fontSize: 24 },
  networkInfo: { flex: 1 },
  networkNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  networkName: { fontSize: 16, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  networkChainId: { fontSize: 13 },
  networkActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primaryButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  spacer: { height: 40 },
});
