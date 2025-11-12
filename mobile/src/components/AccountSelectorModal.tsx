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
} from 'react-native';
import { getAllAccountsWithStatus, switchAccount, type AccountWithStatus } from '../services/accountManagerService';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Account</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Account List */}
          <ScrollView style={styles.accountList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading accounts...</Text>
              </View>
            ) : (
              <>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.index}
                    style={[
                      styles.accountItem,
                      account.isActive && styles.accountItemActive,
                    ]}
                    onPress={() => handleAccountSelect(account)}
                    disabled={switching !== null}
                  >
                    <View style={styles.accountInfo}>
                      <View style={styles.accountNameRow}>
                        <Text style={styles.accountName}>{account.name}</Text>
                        {account.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.accountAddress}>
                        {shortenAddress(account.address)}
                      </Text>
                      {account.hasPendingTransactions && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>
                            ⏱ Pending transactions
                          </Text>
                        </View>
                      )}
                    </View>

                    {switching === account.index ? (
                      <ActivityIndicator size="small" color="#4A90E2" />
                    ) : (
                      <Text style={styles.selectIcon}>
                        {account.isActive ? '✓' : '→'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}

                {accounts.length === 0 && !loading && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No accounts found</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Create Account Button */}
          {showCreateButton && onCreateAccount && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                onCreateAccount();
                onClose();
              }}
            >
              <Text style={styles.createButtonText}>+ Create New Account</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0B0E13',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#9aa0a6',
    fontSize: 24,
  },
  accountList: {
    paddingHorizontal: 20,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#1b1f27',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountItemActive: {
    backgroundColor: '#10141C',
    borderColor: '#4A90E2',
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  accountName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  accountAddress: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  activeBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    marginTop: 6,
    backgroundColor: '#FFA726',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  selectIcon: {
    color: '#4A90E2',
    fontSize: 20,
    marginLeft: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9aa0a6',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  createButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
