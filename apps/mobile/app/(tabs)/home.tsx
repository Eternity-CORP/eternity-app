import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, TextInput, RefreshControl, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, switchAccount, addAccountThunk, updateAccountLabel, importWalletThunk, reorderAccounts, type Account } from '@/src/store/slices/wallet-slice';
import { fetchBalancesThunk } from '@/src/store/slices/balance-slice';
import { fetchTransactionsThunk } from '@/src/store/slices/transaction-slice';
import { loadScheduledPaymentsThunk } from '@/src/store/slices/scheduled-slice';
import { loadPendingSplitsThunk } from '@/src/store/slices/split-slice';
import { resetContacts, loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { useAutoScheduledPayments } from '@/src/hooks/useAutoScheduledPayments';
import { saveAccounts } from '@/src/services/wallet-service';
import { formatUsdValue, fetchAllBalances } from '@/src/services/balance-service';
import { TokenIcon } from '@/src/components/TokenIcon';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generate unique gradient colors from address (like web3 identicons)
function generateAvatarColors(address: string): [string, string] {
  // Use address bytes to generate colors
  const hash = address.toLowerCase().replace('0x', '');

  // First color from first 6 chars
  const color1 = '#' + hash.slice(0, 6);

  // Second color from chars 6-12, but rotate hue for contrast
  const r = parseInt(hash.slice(6, 8), 16);
  const g = parseInt(hash.slice(8, 10), 16);
  const b = parseInt(hash.slice(10, 12), 16);

  // Rotate colors for gradient effect
  const color2 = `rgb(${(r + 128) % 256}, ${(g + 64) % 256}, ${(b + 192) % 256})`;

  return [color1, color2];
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const split = useAppSelector((state) => state.split);
  const currentAccount = getCurrentAccount(wallet);

  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAddWalletMenu, setShowAddWalletMenu] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [seedPhraseInput, setSeedPhraseInput] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  // Animation values for actions menu
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation values for account selector
  const accountSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const accountFadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-execute overdue scheduled payments
  useAutoScheduledPayments();

  // Load data when account changes
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(fetchBalancesThunk(currentAccount.address));
      dispatch(fetchTransactionsThunk(currentAccount.address));
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
      // Reset and reload contacts for the new account
      dispatch(resetContacts());
      dispatch(loadContactsThunk());
    }
  }, [currentAccount?.address, dispatch]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(fetchBalancesThunk(currentAccount.address));
      dispatch(fetchTransactionsThunk(currentAccount.address));
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const totalBalance = formatUsdValue(balance.totalUsdValue);

  // Actions menu animations
  const openActionsMenu = () => {
    slideAnim.setValue(SCREEN_HEIGHT); // Reset position
    setShowActionsMenu(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeActionsMenu = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowActionsMenu(false));
  };

  // Account selector animations
  const openAccountSelector = async () => {
    setShowAccountSelector(true);
    setIsEditMode(false);
    setShowAddWalletMenu(false);
    setShowImportSheet(false);

    // Fetch balances for all accounts in parallel
    const balancePromises = wallet.accounts.map(async (account) => {
      try {
        const result = await fetchAllBalances(account.address);
        return { address: account.address, balance: result.totalUsdValue };
      } catch {
        return { address: account.address, balance: 0 };
      }
    });

    Promise.all(balancePromises).then((results) => {
      const balances: Record<string, number> = {};
      results.forEach(({ address, balance }) => {
        balances[address] = balance;
      });
      setAccountBalances(balances);
    });

    Animated.parallel([
      Animated.spring(accountSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(accountFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeAccountSelector = () => {
    Animated.parallel([
      Animated.timing(accountSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(accountFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAccountSelector(false);
      setIsEditMode(false);
      setShowAddWalletMenu(false);
      setShowImportSheet(false);
      setEditingAccountIndex(null);
      setEditLabel('');
      setSeedPhraseInput('');
      setNewAccountName('');
    });
  };

  // Account management
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Error', 'Please enter account name');
      return;
    }
    setIsAddingAccount(true);
    try {
      const result = await dispatch(addAccountThunk()).unwrap();
      // Update the new account with the name
      const newIndex = wallet.accounts.length;
      dispatch(updateAccountLabel({ accountIndex: newIndex, label: newAccountName.trim() }));
      setShowAddWalletMenu(false);
      setNewAccountName('');
      closeAccountSelector();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      Alert.alert('Error', message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleImportWallet = async () => {
    const words = seedPhraseInput.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      Alert.alert('Error', 'Please enter 12 or 24 words');
      return;
    }
    setIsAddingAccount(true);
    try {
      await dispatch(importWalletThunk(seedPhraseInput.trim())).unwrap();
      setShowImportSheet(false);
      setSeedPhraseInput('');
      closeAccountSelector();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to import wallet';
      Alert.alert('Error', message);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleSwitchAccount = (address: string) => {
    if (isEditMode) return;
    const index = wallet.accounts.findIndex(a => a.address === address);
    if (index !== -1) {
      dispatch(switchAccount(index));
      closeAccountSelector();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSaveLabel = async (accountIndex: number) => {
    const trimmedLabel = editLabel.trim();
    dispatch(updateAccountLabel({ accountIndex, label: trimmedLabel || undefined }));

    const updatedAccounts = wallet.accounts.map((acc) =>
      acc.accountIndex === accountIndex ? { ...acc, label: trimmedLabel || undefined } : acc
    );

    try {
      await saveAccounts(updatedAccounts);
      setEditingAccountIndex(null);
      setEditLabel('');
    } catch {
      Alert.alert('Error', 'Failed to save');
    }
  };

  const handleCopyAddress = async () => {
    if (!currentAccount?.address) return;
    try {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to copy');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/send/scan')}
        >
          <FontAwesome name="qrcode" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountButton}
          onPress={openAccountSelector}
        >
          <Text style={styles.accountButtonText} numberOfLines={1}>
            {currentAccount?.label || `Account ${(currentAccount?.accountIndex ?? 0) + 1}`}
          </Text>
          <FontAwesome name="chevron-down" size={10} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(tabs)/transactions')}
        >
          <FontAwesome name="history" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={balance.status === 'loading'}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Pending Split Banner */}
        {split.pendingSplits.length > 0 && (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => router.push(`/split/${split.pendingSplits[0].id}`)}
          >
            <FontAwesome name="exclamation-circle" size={16} color="#FFA500" />
            <Text style={styles.pendingBannerText}>
              {split.pendingSplits.length} pending payment request{split.pendingSplits.length > 1 ? 's' : ''}
            </Text>
            <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Balance */}
        <View style={styles.balanceSection}>
          <Text style={styles.balance}>
            {balance.status === 'loading' && !balance.lastUpdated ? '...' : totalBalance}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => router.push('/send/token')}
          >
            <Text style={styles.actionButtonPrimaryText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => router.push('/receive')}
          >
            <Text style={styles.actionButtonSecondaryText}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonMore}
            onPress={openActionsMenu}
          >
            <FontAwesome name="ellipsis-h" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tokens List */}
        <View style={styles.tokensSection}>
          <Text style={styles.sectionTitle}>Tokens</Text>

          {balance.balances.map((token) => (
            <TouchableOpacity
              key={token.token}
              style={styles.tokenItem}
              onPress={() => router.push(`/token/${token.symbol}`)}
              activeOpacity={0.7}
            >
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={44} />
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>{token.name || token.symbol}</Text>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
              </View>
              <View style={styles.tokenBalance}>
                <Text style={styles.tokenBalanceValue}>
                  {parseFloat(token.balance).toFixed(4)}
                </Text>
                <Text style={styles.tokenBalanceUsd}>
                  ${token.usdValue?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {balance.balances.length === 0 && balance.status !== 'loading' && (
            <View style={styles.emptyState}>
              <FontAwesome name="inbox" size={32} color={theme.colors.textTertiary} />
              <Text style={styles.emptyStateText}>No tokens yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions Menu with Blur */}
      {showActionsMenu && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeActionsMenu}
            activeOpacity={1}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.actionsMenuContainer,
              { transform: [{ translateY: slideAnim }] },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); router.push('/send/token'); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="arrow-up" size={20} color="#000" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <Text style={styles.actionMenuText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); router.push('/receive'); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="arrow-down" size={20} color="#000" style={{ transform: [{ rotate: '-45deg' }] }} />
              </View>
              <Text style={styles.actionMenuText}>Receive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); router.push('/blik'); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="bolt" size={20} color="#000" />
              </View>
              <Text style={styles.actionMenuText}>BLIK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); router.push('/scheduled/create'); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="calendar" size={20} color="#000" />
              </View>
              <Text style={styles.actionMenuText}>Scheduled</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); router.push('/split/create'); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="users" size={20} color="#000" />
              </View>
              <Text style={styles.actionMenuText}>Split Bill</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => { closeActionsMenu(); handleCopyAddress(); }}
            >
              <View style={styles.actionMenuIcon}>
                <FontAwesome name="copy" size={20} color="#000" />
              </View>
              <Text style={styles.actionMenuText}>Copy Address</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Account Selector Bottom Sheet */}
      {showAccountSelector && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.blurOverlay, { opacity: accountFadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeAccountSelector}>
              <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.accountSheet,
              { transform: [{ translateY: accountSlideAnim }] },
            ]}
          >
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.accountSheetHeader}>
              <TouchableOpacity
                style={styles.editModeButton}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Text style={[styles.editModeText, isEditMode && styles.editModeTextActive]}>
                  {isEditMode ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.accountSheetTitle}>Wallets list</Text>

              <TouchableOpacity
                style={styles.closeSheetButton}
                onPress={closeAccountSelector}
              >
                <FontAwesome name="times" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Accounts List or Add Wallet Menu or Import Sheet */}
            {showImportSheet ? (
              <View style={styles.importSheet}>
                <Text style={styles.importTitle}>Import Wallet</Text>
                <Text style={styles.importSubtitle}>
                  Enter your 12 or 24 word recovery phrase
                </Text>
                <TextInput
                  style={styles.seedInput}
                  value={seedPhraseInput}
                  onChangeText={setSeedPhraseInput}
                  placeholder="Enter seed phrase..."
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.importActions}>
                  <TouchableOpacity
                    style={styles.importCancelButton}
                    onPress={() => { setShowImportSheet(false); setSeedPhraseInput(''); }}
                  >
                    <Text style={styles.importCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.importConfirmButton, isAddingAccount && { opacity: 0.5 }]}
                    onPress={handleImportWallet}
                    disabled={isAddingAccount}
                  >
                    <Text style={styles.importConfirmText}>
                      {isAddingAccount ? 'Importing...' : 'Import'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : showAddWalletMenu ? (
              <View style={styles.addWalletMenu}>
                <Text style={styles.addWalletTitle}>Add Wallet</Text>

                <TextInput
                  style={styles.newAccountInput}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  placeholder="Wallet name"
                  placeholderTextColor={theme.colors.textTertiary}
                />

                <TouchableOpacity
                  style={styles.addWalletOption}
                  onPress={handleAddAccount}
                  disabled={isAddingAccount}
                >
                  <View style={[styles.addWalletIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                    <FontAwesome name="plus" size={18} color={theme.colors.accent} />
                  </View>
                  <View style={styles.addWalletOptionInfo}>
                    <Text style={styles.addWalletOptionTitle}>New Wallet</Text>
                    <Text style={styles.addWalletOptionDesc}>Create a new wallet account</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addWalletOption}
                  onPress={() => { setShowAddWalletMenu(false); setShowImportSheet(true); }}
                >
                  <View style={[styles.addWalletIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                    <FontAwesome name="download" size={18} color="#8B5CF6" />
                  </View>
                  <View style={styles.addWalletOptionInfo}>
                    <Text style={styles.addWalletOptionTitle}>Existing Wallet</Text>
                    <Text style={styles.addWalletOptionDesc}>Import using recovery phrase</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addWalletCancelButton}
                  onPress={() => { setShowAddWalletMenu(false); setNewAccountName(''); }}
                >
                  <Text style={styles.addWalletCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <DraggableFlatList
                  data={wallet.accounts}
                  keyExtractor={(item) => item.id}
                  onDragEnd={({ data }) => {
                    dispatch(reorderAccounts(data));
                    saveAccounts(data);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  containerStyle={styles.accountsList}
                  renderItem={({ item: account, drag, isActive }: RenderItemParams<Account>) => {
                    const [color1, color2] = generateAvatarColors(account.address);
                    const accountIndex = wallet.accounts.findIndex(a => a.address === account.address);
                    const isSelected = accountIndex === wallet.currentAccountIndex;
                    const accountBalance = formatUsdValue(accountBalances[account.address] ?? 0);

                    if (editingAccountIndex === account.accountIndex) {
                      return (
                        <View style={styles.editAccountContainer}>
                          <TextInput
                            style={styles.editAccountInput}
                            value={editLabel}
                            onChangeText={setEditLabel}
                            placeholder="Account name"
                            placeholderTextColor={theme.colors.textTertiary}
                            autoFocus
                          />
                          <View style={styles.editAccountActions}>
                            <TouchableOpacity
                              style={styles.editAccountCancel}
                              onPress={() => { setEditingAccountIndex(null); setEditLabel(''); }}
                            >
                              <Text style={styles.editAccountCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.editAccountSave}
                              onPress={() => handleSaveLabel(account.accountIndex)}
                            >
                              <Text style={styles.editAccountSaveText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <ScaleDecorator>
                        <TouchableOpacity
                          style={[
                            styles.accountListItem,
                            isActive && styles.accountListItemDragging,
                          ]}
                          onPress={() => isEditMode
                            ? (setEditingAccountIndex(account.accountIndex), setEditLabel(account.label || ''))
                            : handleSwitchAccount(account.address)
                          }
                          activeOpacity={0.7}
                          disabled={isActive}
                        >
                          {/* Drag handle - only in edit mode */}
                          {isEditMode && (
                            <TouchableOpacity
                              onLongPress={drag}
                              delayLongPress={100}
                              style={styles.dragHandle}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <FontAwesome name="bars" size={16} color={theme.colors.textTertiary} />
                            </TouchableOpacity>
                          )}

                          {/* Gradient avatar based on address */}
                          <LinearGradient
                            colors={[color1, color2]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.accountAvatar}
                          />

                          <View style={styles.accountListInfo}>
                            <Text style={styles.accountListName}>
                              {account.label || `Account ${account.accountIndex + 1}`}
                            </Text>
                            <Text style={styles.accountListBalance}>{accountBalance}</Text>
                          </View>

                          {isEditMode ? (
                            <FontAwesome name="pencil" size={16} color={theme.colors.textTertiary} />
                          ) : isSelected ? (
                            <FontAwesome name="check" size={18} color={theme.colors.accent} />
                          ) : null}
                        </TouchableOpacity>
                      </ScaleDecorator>
                    );
                  }}
                />

                {/* Add Wallet Button */}
                <TouchableOpacity
                  style={styles.addWalletButton}
                  onPress={() => setShowAddWalletMenu(true)}
                >
                  <Text style={styles.addWalletButtonText}>Add Wallet</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
    maxWidth: 180,
  },
  accountButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA50015',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FFA50030',
  },
  pendingBannerText: {
    ...theme.typography.caption,
    color: '#FFA500',
    flex: 1,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  balance: {
    fontSize: 52,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actionButtonSecondaryText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  actionButtonMore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokensSection: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenSymbol: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenBalanceValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenBalanceUsd: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    gap: theme.spacing.md,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
  },
  // Actions Menu overlay
  darkOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionsMenuContainer: {
    position: 'absolute',
    left: theme.spacing.xl,
    bottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  actionMenuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionMenuText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Legacy sheet styles for account selector
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  // Blur overlay for account selector
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Account Selector Sheet
  accountSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl + 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  accountSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  editModeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  editModeText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  editModeTextActive: {
    color: theme.colors.accent,
  },
  accountSheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  closeSheetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  accountListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  accountListItemDragging: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.xs,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountListInfo: {
    flex: 1,
    gap: 2,
  },
  accountListName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  accountListBalance: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  // Edit account inline
  editAccountContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  editAccountInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editAccountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  editAccountCancel: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  editAccountCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  editAccountSave: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  editAccountSaveText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
  // Add Wallet Button
  addWalletButton: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  addWalletButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  // Add Wallet Menu
  addWalletMenu: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  addWalletTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  newAccountInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addWalletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  addWalletIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWalletOptionInfo: {
    flex: 1,
  },
  addWalletOptionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  addWalletOptionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  addWalletCancelButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  addWalletCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  // Import Sheet
  importSheet: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  importTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  importSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  seedInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  importActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  importCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  importCancelText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  importConfirmButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
  },
  importConfirmText: {
    ...theme.typography.body,
    color: theme.colors.buttonPrimaryText,
    fontWeight: '600',
  },
});
