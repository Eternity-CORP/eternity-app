import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../context/WalletContext';
import { getETHBalance, formatBalance } from '../../services/blockchain/balanceService';
import { useNetwork } from '../../hooks/useNetwork';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import Card from '../common/Card';
import Avatar from '../common/Avatar';

export default function AccountSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accounts, activeAccount, switchAccount, createAccount, busy } = useWallet();
  const { theme, mode } = useTheme();
  const { network: currentNetwork, loading: networkLoading } = useNetwork();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadBalances = async () => {
      if (networkLoading) return;
      const entries: Record<string, string> = {};
      for (const a of accounts) {
        try {
          const bn = await getETHBalance(a.address, currentNetwork);
          entries[a.address] = formatBalance(bn);
        } catch {
          entries[a.address] = '—';
        }
      }
      setBalances(entries);
    };
    if (visible && !networkLoading) loadBalances();
  }, [visible, accounts, currentNetwork, networkLoading]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleSwitchAccount = async (index: number) => {
    try {
      await switchAccount(index);
      onClose();
    } catch (e: any) {
      Alert.alert('Switch failed', e?.message || 'Cannot switch account');
    }
  };

  const handleCreateAccount = async () => {
    try {
      await createAccount();
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Unable to create account');
    }
  };

  const sheetContent = (
    <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Select Account</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Account List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {accounts.map((a) => {
          const isActive = activeAccount?.index === a.index;
          return (
            <TouchableOpacity
              key={a.index}
              style={[
                styles.item,
                {
                  backgroundColor: isActive ? theme.colors.primary + '15' : theme.colors.card,
                  borderColor: isActive ? theme.colors.primary : 'transparent',
                  borderRadius: theme.radius.md,
                }
              ]}
              onPress={() => handleSwitchAccount(a.index)}
              disabled={busy}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <Avatar address={a.address} size={48} />
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]}>{a.name}</Text>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemAddr, { color: theme.colors.textSecondary }]}>
                    {truncate(a.address)}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemBal, { color: theme.colors.text }]}>
                  {balances[a.address] ?? '…'} ETH
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {accounts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>No accounts</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.lg,
            }
          ]}
          onPress={handleCreateAccount}
          accessibilityRole="button"
          disabled={busy}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            }
          ]}
          onPress={() => {
            onClose();
            navigation.navigate('ManageAccounts');
          }}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={styles.blurContainer}
            >
              {sheetContent}
            </BlurView>
          ) : (
            sheetContent
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    // Soft shadow
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    // Soft shadow
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  itemAddr: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemBal: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    // Soft shadow
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryButton: {
    // Background set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  empty: {
    marginTop: 16,
    fontSize: 16,
  },
});
