import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, switchAccount, addAccountThunk, updateAccountLabel } from '@/src/store/slices/wallet-slice';
import { fetchBalancesThunk } from '@/src/store/slices/balance-slice';
import { fetchTransactionsThunk } from '@/src/store/slices/transaction-slice';
import { saveAccounts } from '@/src/services/wallet-service';
import { formatUsdValue } from '@/src/services/balance-service';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const transaction = useAppSelector((state) => state.transaction);
  const currentAccount = getCurrentAccount(wallet);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  
  // Load balances and transactions when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(fetchBalancesThunk(currentAccount.address));
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(fetchBalancesThunk(currentAccount.address));
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  // Get ETH balance
  const ethBalance = balance.balances.find((b) => b.token === 'ETH');
  const totalBalance = formatUsdValue(balance.totalUsdValue);

  const handleAddAccount = async () => {
    setIsAddingAccount(true);
    try {
      await dispatch(addAccountThunk()).unwrap();
      setShowAccountSelector(false);
      Alert.alert('Success', 'New account created successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create new account';
      Alert.alert('Error', message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleSwitchAccount = (index: number) => {
    dispatch(switchAccount(index));
    setShowAccountSelector(false);
  };

  const handleEditAccount = (accountIndex: number, currentLabel?: string) => {
    setEditingAccountIndex(accountIndex);
    setEditLabel(currentLabel || '');
  };

  const handleSaveLabel = async (accountIndex: number) => {
    const trimmedLabel = editLabel.trim();
    
    // Update Redux state
    dispatch(updateAccountLabel({ accountIndex, label: trimmedLabel || undefined }));
    
    // Save updated accounts to storage
    // Get updated accounts from current state after dispatch
    const updatedAccounts = wallet.accounts.map((acc) =>
      acc.accountIndex === accountIndex ? { ...acc, label: trimmedLabel || undefined } : acc
    );
    
    try {
      await saveAccounts(updatedAccounts);
      setEditingAccountIndex(null);
      setEditLabel('');
    } catch (error) {
      console.error('Error saving account label:', error);
      Alert.alert('Error', 'Failed to save account label');
      // Revert Redux state on error
      dispatch(updateAccountLabel({ accountIndex, label: wallet.accounts.find(a => a.accountIndex === accountIndex)?.label }));
    }
  };

  const handleCancelEdit = () => {
    setEditingAccountIndex(null);
    setEditLabel('');
  };

  const handleCopyAddress = async () => {
    if (!currentAccount?.address) return;
    
    try {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Wallet address copied to clipboard');
    } catch (error) {
      console.error('Error copying address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Account Selector Header */}
      <View style={styles.accountHeader}>
        <TouchableOpacity
          style={styles.accountSelector}
          onPress={() => setShowAccountSelector(true)}
        >
          <View style={styles.accountInfo}>
            <Text style={[styles.accountLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {currentAccount?.label || `Account ${currentAccount ? currentAccount.accountIndex + 1 : '1'}`}
            </Text>
            {currentAccount && (
              <View style={styles.accountAddressRow}>
                <Text style={[styles.accountAddress, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCopyAddress();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FontAwesome name="copy" size={14} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <FontAwesome name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={balance.status === 'loading'}
            onRefresh={onRefresh}
            tintColor={theme.colors.buttonPrimary}
          />
        }
      >
      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balance, theme.typography.displayLarge]}>
          {balance.status === 'loading' && !balance.lastUpdated ? '...' : totalBalance}
        </Text>
        <Text style={[styles.balanceLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Total Balance
        </Text>
        {balance.error && (
          <Text style={[styles.balanceError, theme.typography.caption, { color: theme.colors.error }]}>
            {balance.error}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.buttonPrimaryText }]}>
            Buy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <Text style={[styles.actionButtonText, { color: theme.colors.textPrimary }]}>
            Send
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonIcon]}
          onPress={() => router.push('/(tabs)/wallet')}
        >
          <FontAwesome name="ellipsis-h" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Token Cards Section */}
      <View style={styles.tokensSection}>
        {/* Large Token Card (Primary) */}
        <View style={styles.tokenCardLarge}>
          <View style={styles.tokenCardHeader}>
            <View style={styles.tokenIcon}>
              <Text style={[styles.tokenIconText, theme.typography.heading]}>ETH</Text>
            </View>
            <View style={styles.tokenInfo}>
              <Text style={[styles.tokenName, theme.typography.heading]}>Ethereum</Text>
              <Text style={[styles.tokenTicker, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                ETH
              </Text>
            </View>
          </View>
          <View style={styles.tokenCardBody}>
            <Text style={[styles.tokenBalance, theme.typography.title]}>
              {ethBalance ? `${ethBalance.balance} ETH` : '0.00 ETH'}
            </Text>
            <Text style={[styles.tokenValue, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {ethBalance?.usdValue ? formatUsdValue(ethBalance.usdValue) : '$0.00'}
            </Text>
          </View>
        </View>

        {/* Token Grid (2 columns) */}
        {balance.balances.length > 1 && (
          <View style={styles.tokenGrid}>
            {balance.balances
              .filter((b) => b.token !== 'ETH')
              .map((token) => (
                <View key={token.token} style={styles.tokenCardSmall}>
                  <View style={styles.tokenCardHeader}>
                    <View style={[styles.tokenIcon, styles.tokenIconSmall]}>
                      <Text style={[styles.tokenIconTextSmall, theme.typography.caption]}>
                        {token.symbol.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.tokenInfo}>
                      <Text style={[styles.tokenName, theme.typography.body]}>{token.symbol}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tokenBalanceSmall, theme.typography.body]}>
                    {token.balance}
                  </Text>
                  {token.usdValue && (
                    <Text style={[styles.tokenValueSmall, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      {formatUsdValue(token.usdValue)}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        )}
      </View>

      {/* Recent Transactions Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, theme.typography.heading]}>Recent Transactions</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/transactions')}
            style={styles.viewAllButton}
          >
            <Text style={[styles.viewAllText, theme.typography.caption, { color: theme.colors.buttonPrimary }]}>
              View All
            </Text>
            <FontAwesome name="chevron-right" size={12} color={theme.colors.buttonPrimary} style={styles.viewAllIcon} />
          </TouchableOpacity>
        </View>

        {transaction.status === 'loading' && transaction.transactions.length === 0 ? (
          <View style={styles.transactionEmpty}>
            <Text style={[styles.transactionEmptyText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
          </View>
        ) : transaction.transactions.length === 0 ? (
          <View style={styles.transactionEmpty}>
            <FontAwesome name="exchange" size={32} color={theme.colors.textTertiary} />
            <Text style={[styles.transactionEmptyText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              No transactions yet
            </Text>
            <Text style={[styles.transactionEmptySubtext, theme.typography.caption, { color: theme.colors.textTertiary }]}>
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transaction.transactions.slice(0, 5).map((tx) => (
              <TouchableOpacity
                key={tx.hash}
                style={styles.transactionItem}
                onPress={() => router.push('/(tabs)/transactions')}
              >
                <View style={styles.transactionIcon}>
                  <FontAwesome
                    name={tx.direction === 'sent' ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={tx.direction === 'sent' ? theme.colors.error : theme.colors.success || theme.colors.buttonPrimary}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDirection, theme.typography.body]}>
                    {tx.direction === 'sent' ? 'Sent' : 'Received'}
                  </Text>
                  <Text style={[styles.transactionDate, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionAmountText,
                    theme.typography.body,
                    { color: tx.direction === 'sent' ? theme.colors.textPrimary : theme.colors.success || theme.colors.buttonPrimary }
                  ]}>
                    {tx.direction === 'sent' ? '-' : '+'}{tx.amount} {tx.token}
                  </Text>
                  <View style={styles.transactionStatus}>
                    <View style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          tx.status === 'confirmed' ? (theme.colors.success || theme.colors.buttonPrimary) :
                          tx.status === 'pending' ? theme.colors.warning || '#FFA500' :
                          theme.colors.error
                      }
                    ]} />
                    <Text style={[styles.transactionStatusText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      </ScrollView>

      {/* Account Selector Modal */}
      <Modal
        visible={showAccountSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountSelector(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountSelector(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, theme.typography.title]}>Select Account</Text>
              <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                <FontAwesome name="times" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.accountsList}>
              {wallet.accounts.map((account, index) => (
                <View
                  key={account.id}
                  style={[
                    styles.accountItem,
                    index === wallet.currentAccountIndex && styles.accountItemActive,
                  ]}
                >
                  {editingAccountIndex === account.accountIndex ? (
                    <View style={styles.accountEditContainer}>
                      <TextInput
                        style={[styles.accountEditInput, theme.typography.heading]}
                        value={editLabel}
                        onChangeText={setEditLabel}
                        placeholder="Account name (optional)"
                        placeholderTextColor={theme.colors.textTertiary}
                        autoFocus
                        maxLength={30}
                      />
                      <View style={styles.accountEditActions}>
                        <TouchableOpacity
                          style={styles.accountEditButton}
                          onPress={handleCancelEdit}
                        >
                          <Text style={[styles.accountEditButtonText, { color: theme.colors.textSecondary }]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.accountEditButton, styles.accountEditButtonSave]}
                          onPress={() => handleSaveLabel(account.accountIndex)}
                        >
                          <Text style={[styles.accountEditButtonText, { color: theme.colors.buttonPrimary }]}>
                            Save
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.accountItemTouchable}
                        onPress={() => handleSwitchAccount(index)}
                      >
                        <View style={styles.accountItemContent}>
                          <Text style={[styles.accountItemLabel, theme.typography.heading]}>
                            {account.label || `Account ${account.accountIndex + 1}`}
                          </Text>
                          <Text style={[styles.accountItemAddress, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                            {account.address.slice(0, 8)}...{account.address.slice(-6)}
                          </Text>
                        </View>
                        {index === wallet.currentAccountIndex && (
                          <FontAwesome name="check" size={16} color={theme.colors.buttonPrimary} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.accountEditIcon}
                        onPress={() => handleEditAccount(account.accountIndex, account.label)}
                      >
                        <FontAwesome name="pencil" size={14} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.addAccountButton, isAddingAccount && styles.addAccountButtonDisabled]}
                onPress={handleAddAccount}
                disabled={isAddingAccount}
              >
                <FontAwesome name="plus" size={16} color={theme.colors.buttonPrimaryText} style={styles.addAccountIcon} />
                <Text style={[styles.addAccountText, theme.typography.heading, { color: theme.colors.buttonPrimaryText }]}>
                  {isAddingAccount ? 'Creating...' : 'Add Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  accountHeader: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    marginBottom: theme.spacing.xs / 2,
  },
  accountAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  accountAddress: {
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    paddingBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
  },
  accountsList: {
    maxHeight: 400,
  },
  accountItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
    position: 'relative',
  },
  accountItemActive: {
    backgroundColor: theme.colors.surface,
  },
  accountItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingRight: theme.spacing.xl + 20, // Space for edit icon
  },
  accountItemContent: {
    flex: 1,
  },
  accountItemLabel: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  accountItemAddress: {
    fontFamily: 'monospace',
  },
  accountEditIcon: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: '50%',
    transform: [{ translateY: -7 }],
    padding: theme.spacing.sm,
  },
  accountEditContainer: {
    padding: theme.spacing.lg,
  },
  accountEditInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  accountEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  accountEditButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  accountEditButtonSave: {
    // Additional styles if needed
  },
  accountEditButtonText: {
    ...theme.typography.heading,
  },
  modalActions: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  addAccountButtonDisabled: {
    opacity: 0.5,
  },
  addAccountIcon: {
    marginRight: theme.spacing.xs,
  },
  addAccountText: {
    // Already styled
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  balance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceError: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  actionButtonIcon: {
    backgroundColor: theme.colors.surface,
    flex: 0,
    width: 56,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.full,
  },
  actionButtonText: {
    ...theme.typography.heading,
  },
  tokensSection: {
    gap: theme.spacing.lg,
  },
  tokenCardLarge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  tokenIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  tokenIconSmall: {
    width: 32,
    height: 32,
  },
  tokenIconText: {
    color: theme.colors.buttonPrimaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  tokenIconTextSmall: {
    color: theme.colors.textSecondary,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tokenTicker: {
    textTransform: 'uppercase',
  },
  tokenCardBody: {
    alignItems: 'flex-start',
  },
  tokenBalance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tokenValue: {
    // Already styled
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  tokenCardSmall: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '48%',
  },
  tokenBalanceSmall: {
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  tokenValueSmall: {
    marginTop: theme.spacing.xs,
  },
  transactionsSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  viewAllText: {
    color: theme.colors.buttonPrimary,
  },
  viewAllIcon: {
    marginLeft: theme.spacing.xs / 2,
  },
  transactionsList: {
    gap: theme.spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDirection: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  transactionDate: {
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    marginBottom: theme.spacing.xs / 2,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatusText: {
    textTransform: 'capitalize',
  },
  transactionEmpty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    gap: theme.spacing.md,
  },
  transactionEmptyText: {
    textAlign: 'center',
  },
  transactionEmptySubtext: {
    textAlign: 'center',
  },
});
