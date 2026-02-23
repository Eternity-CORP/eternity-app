import { StyleSheet, ScrollView, Alert, RefreshControl, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, switchAccount, addAccountThunk, updateAccountLabel, importWalletThunk, reorderAccounts, selectIsTestAccount, selectCurrentAccountType, type Account, type AccountType } from '@/src/store/slices/wallet-slice';
import { fetchMultiNetworkBalancesThunk } from '@/src/store/slices/balance-slice';
import { fetchTransactionsThunk } from '@/src/store/slices/transaction-slice';
import { loadScheduledPaymentsThunk } from '@/src/store/slices/scheduled-slice';
import { loadPendingSplitsThunk } from '@/src/store/slices/split-slice';
import { resetContacts, loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { checkAndScanThunk, dismissTokenAlert, snoozeTokenAlert } from '@/src/store/slices/scanning-slice';
import { dismissSuggestion } from '@/src/store/slices/ai-slice';
import { saveAccounts } from '@/src/services/wallet-service';
import { formatUsd } from '@e-y/shared';
import { fetchAllNetworkBalances } from '@/src/services/network-service';
import { getUsernameByAddress } from '@/src/services/username-service';
import { useAutoScheduledPayments } from '@/src/hooks/useAutoScheduledPayments';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import type { Tier2TokenBalance } from '@/src/services/smart-scanning-service';
import type { FaucetInfo } from '@/src/constants/faucets';

import {
  HomeHeader,
  BalanceSection,
  ActionButtons,
  TokensList,
  SharesList,
  BannerSection,
  ActionsMenu,
  AccountSelectorSheet,
  FaucetSheet,
} from '@/src/components/home';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const split = useAppSelector((state) => state.split);
  const scanning = useAppSelector((state) => state.scanning);
  const scheduled = useAppSelector((state) => state.scheduled);
  const aiSuggestions = useAppSelector((state) => state.ai.suggestions);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const currentAccountType = useAppSelector(selectCurrentAccountType);
  const currentAccount = getCurrentAccount(wallet);

  const [showAllScanningAlerts, setShowAllScanningAlerts] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAddWalletMenu, setShowAddWalletMenu] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showFaucetSheet, setShowFaucetSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [seedPhraseInput, setSeedPhraseInput] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [accountUsernames, setAccountUsernames] = useState<Record<string, string | null>>({});

  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const accountSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const accountFadeAnim = useRef(new Animated.Value(0)).current;
  const faucetSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const faucetFadeAnim = useRef(new Animated.Value(0)).current;

  useAutoScheduledPayments();

  // Load data when account changes
  useEffect(() => {
    if (currentAccount?.address && currentAccountType) {
      dispatch(fetchMultiNetworkBalancesThunk({ address: currentAccount.address, accountType: currentAccountType }));
      dispatch(fetchTransactionsThunk({ address: currentAccount.address, accountType: currentAccountType }));
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
      dispatch(resetContacts());
      dispatch(loadContactsThunk());
      if (currentAccountType === 'real') {
        dispatch(checkAndScanThunk(currentAccount.address));
      }
    }
  }, [currentAccount?.address, currentAccountType, dispatch]);

  // Handlers
  const handleBridgeToken = useCallback((tokenBalance: Tier2TokenBalance, destinationNetwork: string) => {
    Alert.alert(
      'Bridge Token',
      `Move ${tokenBalance.balanceFormatted} from ${tokenBalance.networkName} to ${destinationNetwork}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => Alert.alert('Coming Soon', 'Bridge functionality will be available soon.') },
      ]
    );
  }, []);

  const handleDismissAlert = useCallback((networkId: string, tokenSymbol: string) => {
    dispatch(dismissTokenAlert({ networkId, tokenSymbol }));
  }, [dispatch]);

  const handleSnoozeAlert = useCallback((networkId: string, tokenSymbol: string) => {
    dispatch(snoozeTokenAlert({ networkId, tokenSymbol }));
  }, [dispatch]);

  const handleDismissSuggestion = useCallback((id: string) => {
    dispatch(dismissSuggestion(id));
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    if (currentAccount?.address && currentAccountType) {
      dispatch(fetchMultiNetworkBalancesThunk({ address: currentAccount.address, accountType: currentAccountType }));
      dispatch(fetchTransactionsThunk({ address: currentAccount.address, accountType: currentAccountType }));
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, currentAccountType, dispatch]);

  const handleCopyAddress = useCallback(async () => {
    if (!currentAccount?.address) return;
    try {
      await Clipboard.setStringAsync(currentAccount.address);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to copy');
    }
  }, [currentAccount?.address]);

  // Actions menu
  const openActionsMenu = useCallback(() => {
    slideAnim.setValue(SCREEN_HEIGHT);
    setShowActionsMenu(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [slideAnim]);

  const closeActionsMenu = useCallback(() => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => setShowActionsMenu(false));
  }, [slideAnim]);

  // Account selector
  const openAccountSelector = useCallback(async () => {
    setShowAccountSelector(true);
    setIsEditMode(false);
    setShowAddWalletMenu(false);
    setShowImportSheet(false);

    const balancePromises = wallet.accounts.map(async (account) => {
      try {
        const result = await fetchAllNetworkBalances(account.address, account.type);
        return { address: account.address, balance: result.totalUsdValue };
      } catch {
        return { address: account.address, balance: 0 };
      }
    });

    Promise.all(balancePromises).then((results) => {
      const balances: Record<string, number> = {};
      results.forEach(({ address, balance }) => { balances[address] = balance; });
      setAccountBalances(balances);
    });

    const usernamePromises = wallet.accounts.map(async (account) => {
      try {
        const username = await getUsernameByAddress(account.address);
        return { address: account.address, username };
      } catch {
        return { address: account.address, username: null };
      }
    });

    Promise.all(usernamePromises).then((results) => {
      const usernames: Record<string, string | null> = {};
      results.forEach(({ address, username }) => { usernames[address] = username; });
      setAccountUsernames(usernames);
    });

    Animated.parallel([
      Animated.spring(accountSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(accountFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [wallet.accounts, accountSlideAnim, accountFadeAnim]);

  const closeAccountSelector = useCallback(() => {
    Animated.parallel([
      Animated.timing(accountSlideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(accountFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
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
  }, [accountSlideAnim, accountFadeAnim]);

  // Faucet sheet
  const openFaucetSheet = useCallback(() => {
    setShowFaucetSheet(true);
    Animated.parallel([
      Animated.spring(faucetSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(faucetFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [faucetSlideAnim, faucetFadeAnim]);

  const closeFaucetSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(faucetSlideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(faucetFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowFaucetSheet(false));
  }, [faucetSlideAnim, faucetFadeAnim]);

  const handleFaucetPress = useCallback(async (faucet: FaucetInfo) => {
    try {
      await Linking.openURL(faucet.url);
      closeFaucetSheet();
    } catch {
      Alert.alert('Error', 'Could not open faucet link');
    }
  }, [closeFaucetSheet]);

  // Account management
  const handleAddAccount = useCallback(async (accountType: AccountType) => {
    setIsAddingAccount(true);
    try {
      await dispatch(addAccountThunk(accountType)).unwrap();
      const newIndex = wallet.accounts.length;
      const accountLabel = newAccountName.trim() || `Wallet ${newIndex + 1}`;
      dispatch(updateAccountLabel({ accountIndex: newIndex, label: accountLabel }));
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
  }, [dispatch, wallet.accounts.length, newAccountName, closeAccountSelector]);

  const handleImportWallet = useCallback(async () => {
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
  }, [dispatch, seedPhraseInput, closeAccountSelector]);

  const handleSwitchAccount = useCallback((address: string) => {
    if (isEditMode) return;
    const index = wallet.accounts.findIndex(a => a.address === address);
    if (index !== -1) {
      dispatch(switchAccount(index));
      closeAccountSelector();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isEditMode, wallet.accounts, dispatch, closeAccountSelector]);

  const handleSaveLabel = useCallback(async (accountIndex: number) => {
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
  }, [editLabel, wallet.accounts, dispatch]);

  const handleReorderAccounts = useCallback((data: Account[]) => {
    dispatch(reorderAccounts(data));
    saveAccounts(data);
  }, [dispatch]);

  const totalBalance = formatUsd(balance.totalUsdValue);
  const scheduledPendingCount = scheduled.payments.filter(p => p.status === 'pending').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <HomeHeader
        currentAccount={currentAccount ?? undefined}
        onOpenAccountSelector={openAccountSelector}
      />

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
        <BannerSection
          pendingSplitsCount={split.pendingSplits.length}
          firstSplitId={split.pendingSplits[0]?.id}
          scheduledPendingCount={scheduledPendingCount}
          visibleAlerts={scanning.visibleAlerts}
          scanningTotalUsdValue={scanning.totalUsdValue}
          showAllScanningAlerts={showAllScanningAlerts}
          onShowAllScanningAlerts={() => setShowAllScanningAlerts(true)}
          onBridgeToken={handleBridgeToken}
          onDismissAlert={handleDismissAlert}
          onSnoozeAlert={handleSnoozeAlert}
          aiSuggestions={aiSuggestions}
          onDismissSuggestion={handleDismissSuggestion}
        />

        <BalanceSection
          totalBalance={totalBalance}
          isLoading={balance.status === 'loading'}
          lastUpdated={balance.lastUpdated}
        />

        <ActionButtons onOpenActionsMenu={openActionsMenu} />

        <SharesList />

        <TokensList
          balances={balance.balances}
          isLoading={balance.status === 'loading'}
          aggregatedBalances={balance.aggregatedBalances}
        />
      </ScrollView>

      <ActionsMenu
        visible={showActionsMenu}
        slideAnim={slideAnim}
        onClose={closeActionsMenu}
        onCopyAddress={handleCopyAddress}
        isTestAccount={isTestAccount}
        onOpenFaucet={openFaucetSheet}
      />

      <AccountSelectorSheet
        visible={showAccountSelector}
        accounts={wallet.accounts}
        currentAccountIndex={wallet.currentAccountIndex}
        accountBalances={accountBalances}
        accountUsernames={accountUsernames}
        isEditMode={isEditMode}
        editingAccountIndex={editingAccountIndex}
        editLabel={editLabel}
        isAddingAccount={isAddingAccount}
        showAddWalletMenu={showAddWalletMenu}
        showImportSheet={showImportSheet}
        seedPhraseInput={seedPhraseInput}
        newAccountName={newAccountName}
        slideAnim={accountSlideAnim}
        fadeAnim={accountFadeAnim}
        onClose={closeAccountSelector}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        onSwitchAccount={handleSwitchAccount}
        onReorderAccounts={handleReorderAccounts}
        onStartEditing={(idx, label) => { setEditingAccountIndex(idx); setEditLabel(label); }}
        onEditLabelChange={setEditLabel}
        onSaveLabel={handleSaveLabel}
        onCancelEdit={() => { setEditingAccountIndex(null); setEditLabel(''); }}
        onShowAddWalletMenu={() => setShowAddWalletMenu(true)}
        onHideAddWalletMenu={() => { setShowAddWalletMenu(false); setNewAccountName(''); }}
        onNewAccountNameChange={setNewAccountName}
        onAddAccount={handleAddAccount}
        onShowImportSheet={() => { setShowAddWalletMenu(false); setShowImportSheet(true); }}
        onHideImportSheet={() => { setShowImportSheet(false); setSeedPhraseInput(''); }}
        onSeedPhraseChange={setSeedPhraseInput}
        onImportWallet={handleImportWallet}
      />

      <FaucetSheet
        visible={showFaucetSheet}
        slideAnim={faucetSlideAnim}
        fadeAnim={faucetFadeAnim}
        address={currentAccount?.address ?? ''}
        onClose={closeFaucetSheet}
        onFaucetPress={handleFaucetPress}
        onClaimed={() => {
          if (currentAccount?.address && currentAccountType) {
            dispatch(fetchMultiNetworkBalancesThunk({ address: currentAccount.address, accountType: currentAccountType }));
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
});
