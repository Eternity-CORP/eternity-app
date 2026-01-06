/**
 * Account Selector Modal
 *
 * Reusable modal component for selecting between accounts.
 * Shows active account indicator and allows quick switching.
 *
 * Usage:
 * <AccountSelectorModal
 *   visible={showSelector}
 *   onClose={() => setShowSelector(false)}
 *   onAccountSelected={(account) => {
 *     // Handle account selection
 *     setShowSelector(false);
 *   }}
 * />
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getAllAccountsWithStatus, switchAccount, type AccountWithStatus } from '../services/accountManagerService';
import { useTheme } from '../context/ThemeContext';
import Avatar from './common/Avatar';

interface AccountSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountSelected?: (account: AccountWithStatus) => void;
  autoSwitch?: boolean; // Automatically switch account when selected
  showCreateButton?: boolean; // Show "Create New Account" button
  onCreateAccount?: () => void;
}

export default function AccountSelectorModal({
  visible,
  onClose,
  onAccountSelected,
  autoSwitch = true,
  showCreateButton = false,
  onCreateAccount,
}: AccountSelectorModalProps) {
  const { theme, mode } = useTheme();
  const [accounts, setAccounts] = useState<AccountWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadAccounts();
    }
  }, [visible]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsWithStatus = await getAllAccountsWithStatus();
      setAccounts(accountsWithStatus);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (account: AccountWithStatus) => {
    if (account.isActive) {
      // Already active, just close
      onAccountSelected?.(account);
      onClose();
      return;
    }

    if (autoSwitch) {
      try {
        setSwitching(account.index);
        const result = await switchAccount(account.index);

        if (result.success) {
          onAccountSelected?.(account);
          onClose();
        }
      } catch (error) {
        console.error('Failed to switch account:', error);
      } finally {
        setSwitching(null);
      }
    } else {
      onAccountSelected?.(account);
      onClose();
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const modalContent = (
    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Account</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Account List */}
      <ScrollView style={styles.accountList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading accounts...
            </Text>
          </View>
        ) : (
          <>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.index}
                style={[
                  styles.accountItem,
                  {
                    backgroundColor: account.isActive
                      ? theme.colors.primary + '15'
                      : theme.colors.card,
                    borderColor: account.isActive ? theme.colors.primary : 'transparent',
                    borderRadius: theme.radius.md,
                  },
                ]}
                onPress={() => handleAccountSelect(account)}
                disabled={switching !== null}
                activeOpacity={0.7}
              >
                <View style={styles.accountLeft}>
                  <Avatar address={account.address} size={48} />
                  <View style={styles.accountInfo}>
                    <View style={styles.accountNameRow}>
                      <Text style={[styles.accountName, { color: theme.colors.text }]}>
                        {account.name}
                      </Text>
                      {account.isActive && (
                        <View style={[styles.activeBadge, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.accountAddress, { color: theme.colors.textSecondary }]}>
                      {shortenAddress(account.address)}
                    </Text>
                    {account.hasPendingTransactions && (
                      <View style={[styles.pendingBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.warning} />
                        <Text style={[styles.pendingBadgeText, { color: theme.colors.warning }]}>
                          Pending transactions
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {switching === account.index ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : account.isActive ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}

            {accounts.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No accounts found
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Account Button */}
      {showCreateButton && onCreateAccount && (
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.lg,
            },
          ]}
          onPress={() => {
            onCreateAccount();
            onClose();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create New Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={mode === 'dark' ? 'dark' : 'light'}
              style={styles.blurContainer}
            >
              {modalContent}
            </BlurView>
          ) : (
            modalContent
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  modalContent: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  accountList: {
    paddingHorizontal: 0,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  accountAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
