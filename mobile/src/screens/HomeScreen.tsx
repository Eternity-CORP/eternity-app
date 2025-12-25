import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MainStackParamList } from '../navigation/MainNavigator';
import { getETHBalance, formatBalance, autoRefreshBalance } from '../services/blockchain/balanceService';
import { diagnoseNetwork, testBalanceRetrieval } from '../services/blockchain/networkDiagnostics';
import { ethers } from 'ethers';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../context/WalletContext';
import AccountSwitcher from '../components/wallet/AccountSwitcher';
import TransactionList from '../components/TransactionList';
import ScheduledPaymentsList from '../components/ScheduledPaymentsList';
import { SUPPORTED_TOKENS, TokenInfo, getTokenAddressForNetwork } from '../constants/tokens';
import { getTokenBalance } from '../services/blockchain/tokenService';
import { getTokenPreferences } from '../services/state/tokenPreferences';
import { getEthUsdPrice, getTokenUsdPrice } from '../services/priceService';
import { getTransactionHistory, Transaction, clearTransactionCache } from '../services/blockchain/etherscanService';
import { getExplorerUrl } from '../constants/etherscanApi';
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import BalanceCard from '../components/common/BalanceCard'
import Card from '../components/common/Card'
import Avatar from '../components/common/Avatar'
import Button from '../components/common/Button'
import TokenIcon from '../components/common/TokenIcon'
import BottomTabBar from '../components/common/BottomTabBar'
import { getUnpaidCount } from '../services/pendingPaymentsService'
import { useFocusEffect } from '@react-navigation/native'
import { isBalanceHidden } from '../services/privacySettingsService'
import { getSelectedNetwork } from '../services/networkService'
import { getNetworkMode, onNetworkModeChange, type NetworkMode } from '../services/networkModeService'
import type { Network } from '../config/env'
import { checkIncomingTransactions } from '../services/incomingTxMonitor'
import { useShardAnimation } from '../features/shards/ShardAnimationProvider'
import { getMyProfile, type UserProfile } from '../services/api/identityService'
import { loginWithWallet } from '../services/authService'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { activeAccount, createAccount } = useWallet();
  const { theme, mode } = useTheme();
  const { triggerShardAnimation } = useShardAnimation();
  const insets = useSafeAreaInsets();
  const address = activeAccount?.address || '';
  const [balanceEth, setBalanceEth] = useState<string>('0.000000');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [usdTotal, setUsdTotal] = useState<number>(0);
  const [tokenRows, setTokenRows] = useState<{ token: TokenInfo | { name: string; symbol: string; address: string; decimals: number; logoUri: string }, amount: string, usd: string, network: Network }[]>([]);
  const [unpaidPaymentsCount, setUnpaidPaymentsCount] = useState<number>(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');
  const [currentMode, setCurrentMode] = useState<NetworkMode>('demo');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const truncated = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  // Check if balance should be hidden
  useEffect(() => {
    const checkHidden = async () => {
      const isHidden = await isBalanceHidden();
      setHideBalance(isHidden);
    };
    checkHidden();

    // Re-check every second
    const interval = setInterval(checkHidden, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load current network and mode
  useEffect(() => {
    const loadNetworkAndMode = async () => {
      const network = await getSelectedNetwork();
      const mode = await getNetworkMode();
      setCurrentNetwork(network);
      setCurrentMode(mode);
    };
    loadNetworkAndMode();

    // Subscribe to mode changes for instant updates
    const unsubscribeModeChange = onNetworkModeChange((newMode, newNetwork) => {
      console.log(`🔄 [HomeScreen] Network mode changed: ${newMode} → ${newNetwork}`);
      setCurrentMode(newMode);
      setCurrentNetwork(newNetwork);
      // Clear data immediately - new data will be fetched by dependent useEffects
      setTokenRows([]);
      setTransactions([]);
      setUsdTotal(0);
      setBalanceEth('0.000000');
    });

    // Fallback polling for manual network changes (not via mode switch)
    const interval = setInterval(loadNetworkAndMode, 5000);
    
    return () => {
      unsubscribeModeChange();
      clearInterval(interval);
    };
  }, []);

  // Balance auto-refresh - depends on BOTH address AND currentNetwork
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const init = async () => {
      if (!address || !currentNetwork) return;
      console.log(`🔄 [HomeScreen] Starting balance refresh for ${currentNetwork}`);
      unsubscribe = autoRefreshBalance(address, (bn) => setBalanceEth(formatBalance(bn)), 30000, currentNetwork);
    };
    init();
    return () => {
      if (unsubscribe) {
        console.log(`🛑 [HomeScreen] Stopping balance refresh`);
        unsubscribe();
      }
    };
  }, [address, currentNetwork]);

  // Fetch transactions when address OR network changes
  useEffect(() => {
    // Clear previous transactions when network changes
    setTransactions([]);
    fetchTransactions();
  }, [address, currentNetwork]);

  // Load unpaid payments count and user profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadUnpaidCount = async () => {
        const count = await getUnpaidCount();
        setUnpaidPaymentsCount(count);
      };
      loadUnpaidCount();

      // Load user profile with short timeout (10s)
      const loadProfile = async () => {
        if (!address) return;

        try {
          setLoadingProfile(true);
          const token = await loginWithWallet(address, 10000);
          if (token) {
            const profile = await getMyProfile(token);
            setUserProfile(profile);
          }
        } catch (error) {
          console.warn('[HomeScreen] Failed to load profile:', error);
          // Don't show error to user, profile is optional
        } finally {
          setLoadingProfile(false);
        }
      };
      loadProfile();

      // Check for incoming transactions and award shards
      const checkIncoming = async () => {
        if (!address || !currentNetwork) return;

        try {
          const shardsAwarded = await checkIncomingTransactions(address, currentNetwork);
          if (shardsAwarded > 0) {
            triggerShardAnimation(shardsAwarded);
            console.log(`[HomeScreen] Awarded ${shardsAwarded} shard(s) for incoming transactions`);
          }
        } catch (error) {
          console.error('[HomeScreen] Failed to check incoming transactions:', error);
        }
      };
      checkIncoming();
    }, [address, currentNetwork, triggerShardAnimation])
  );

  useEffect(() => {
    const run = async () => {
      if (!address) return;
      const prefs = await getTokenPreferences();
      const ethPrice = await getEthUsdPrice();
      const visible = new Set(prefs.visibleSymbols);

      const baseTokens: TokenInfo[] = SUPPORTED_TOKENS.filter(t => visible.has(t.symbol));
      const customTokens = prefs.customTokens.filter(t => visible.has(t.symbol));
      const allTokens = [...baseTokens, ...customTokens];

      // CRITICAL FIX: Only scan networks available in current mode
      // live mode = mainnet only, demo mode = testnets only
      const networks: Network[] = currentMode === 'live' 
        ? ['mainnet'] 
        : ['sepolia', 'holesky'];
      
      const rows: any[] = [];
      let totalUsd = 0;

      console.log('🔄 Scanning assets across networks:', networks);

      for (const network of networks) {
        try {
          // 1. Native ETH Balance
          const ethBn = await getETHBalance(address, network);
          const ethAmt = Number(formatBalance(ethBn));

          if (ethAmt > 0) {
            const val = ethAmt * (ethPrice || 0);
            const netLabel = network === 'mainnet' ? 'Mainnet' : network.charAt(0).toUpperCase() + network.slice(1);
            
            rows.push({
              token: { 
                name: 'Ethereum', 
                symbol: 'ETH', 
                address: '', 
                decimals: 18, 
                logoUri: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' 
              },
              amount: `${ethAmt.toFixed(4)} ETH`,
              usd: `$${val.toFixed(2)}`,
              network: network
            });
            totalUsd += val;
            
            // Update main balance display if this is the currently selected network
            if (network === currentNetwork) {
              setBalanceEth(ethAmt.toFixed(6));
            }
          }

          // 2. Token Balances
          for (const token of allTokens) {
            const addr = getTokenAddressForNetwork(token as TokenInfo, network);
            if (!addr || addr.length === 0) continue;

            try {
              const balBN = await getTokenBalance(addr, address, network);
              const amountNum = Number(ethers.utils.formatUnits(balBN, token.decimals));

              if (amountNum > 0) {
                const price = await getTokenUsdPrice(token.symbol);
                const val = amountNum * price;
                rows.push({
                  token,
                  amount: `${amountNum.toFixed(4)} ${token.symbol}`,
                  usd: `$${val.toFixed(2)}`,
                  network: network
                });
                totalUsd += val;
              }
            } catch (err) {
              // Ignore token fetch errors
            }
          }
        } catch (e) {
          console.warn(`Failed to scan ${network}:`, e);
        }
      }

      setTokenRows(rows);
      setUsdTotal(totalUsd);
    };

    // Clear previous data immediately when network/mode changes
    setTokenRows([]);
    setUsdTotal(0);
    setBalanceEth('0.000000');
    
    run();
    const timer = setInterval(run, 30000);
    return () => clearInterval(timer);
  }, [address, currentNetwork, currentMode]);

  const fetchTransactions = async (forceRefresh = false) => {
    if (!address || !currentNetwork) return;

    try {
      setLoadingTransactions(true);
      console.log(`📜 Loading transaction history for ${currentNetwork} (force: ${forceRefresh})...`);

      const txHistory = await getTransactionHistory(address, { network: currentNetwork, page: 1, offset: 50, forceRefresh });

      setTransactions(txHistory);

      if (txHistory.length === 0) {
        console.log(`ℹ️  No transactions to display on ${currentNetwork}`);
      } else {
        console.log(`✅ Loaded ${txHistory.length} transactions on ${currentNetwork}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to fetch transactions: ${error.message}`);
      // Don't crash, just show empty list
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleRefresh = async () => {
    if (!address || !currentNetwork) return;
    console.log(`🔄 [HomeScreen] Refreshing balance and transactions for ${currentNetwork}...`);
    // Clear transaction cache first
    await clearTransactionCache(address, currentNetwork);
    const bn = await getETHBalance(address, currentNetwork);
    setBalanceEth(formatBalance(bn));
    await fetchTransactions(true); // Force refresh transactions
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
    } catch (e) {
      console.warn('Copy address failed', e);
    }
  };

  const handleCopyNickname = async () => {
    if (!userProfile?.nickname) return;
    try {
      await Clipboard.setStringAsync(userProfile.nickname);
    } catch (e) {
      console.warn('Copy nickname failed', e);
    }
  };

  const handleCopyGlobalId = async () => {
    if (!userProfile?.globalId) return;
    try {
      await Clipboard.setStringAsync(userProfile.globalId);
    } catch (e) {
      console.warn('Copy global ID failed', e);
    }
  };

  const handleDiagnose = async () => {
    if (!address || !currentNetwork) return;
    console.log(`=== NETWORK DIAGNOSTICS (${currentNetwork}) ===`);
    const networkDiag = await diagnoseNetwork(currentNetwork);
    const balanceTest = await testBalanceRetrieval(address, currentNetwork);
    console.log('Network diagnosis:', networkDiag);
    console.log('Balance test:', balanceTest);
    console.log('=== END DIAGNOSTICS ===');
  };

  const handleActionPress = async (action: () => void) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    action();
  };

  const getNetworkColor = (network: Network) => {
    switch (network) {
      case 'mainnet': return '#30D158';
      case 'sepolia': return '#FFD60A';
      case 'holesky': return '#FF9500';
      default: return theme.colors.primary;
    }
  };

  const getNetworkLabel = (network: Network) => {
    switch (network) {
      case 'mainnet': return 'Mainnet';
      case 'sepolia': return 'Sepolia';
      case 'holesky': return 'Holesky';
      default: return network;
    }
  };

  return (
    <>
      <AccountSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background, '#0D0D0D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent, 
              { paddingTop: insets.top + 8, paddingBottom: 100 + insets.bottom }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Simplified Header - Telegram/TON Wallet style */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => handleActionPress(() => setSwitcherOpen(true))}
                style={styles.avatarContainer}
              >
                <Avatar address={address} size={40} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <View style={styles.headerTopRow}>
                  <TouchableOpacity onPress={handleCopyAddress} style={styles.addressRow}>
                    <Text style={[styles.addressText, { color: theme.colors.text }]}>
                      {truncated}
                    </Text>
                    <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {/* Mode Indicator */}
                  <TouchableOpacity 
                    onPress={() => handleActionPress(() => navigation.navigate('Settings'))}
                    style={[
                      styles.modeBadge,
                      { 
                        backgroundColor: currentMode === 'live' 
                          ? 'rgba(76, 175, 80, 0.15)' 
                          : 'rgba(255, 152, 0, 0.15)' 
                      }
                    ]}
                  >
                    <View style={[
                      styles.modeDot, 
                      { backgroundColor: currentMode === 'live' ? '#4CAF50' : '#FF9800' }
                    ]} />
                    <Text style={[
                      styles.modeText, 
                      { color: currentMode === 'live' ? '#4CAF50' : '#FF9800' }
                    ]}>
                      {currentMode === 'live' ? 'Live' : 'Demo'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {userProfile?.nickname && (
                  <TouchableOpacity onPress={handleCopyNickname}>
                    <Text style={[styles.walletName, { color: theme.colors.textSecondary }]}>
                      @{userProfile.nickname}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity 
                  onPress={() => handleActionPress(handleRefresh)}
                  style={styles.headerIconButton}
                >
                  <Ionicons name="refresh" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleActionPress(() => navigation.navigate('Settings'))}
                  style={styles.headerIconButton}
                >
                  <Ionicons name="settings-outline" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance Card - Simplified */}
            <View style={styles.balanceSection}>
              <BalanceCard amount={usdTotal} currency="USD" subtitle="Total Balance" />
            </View>

            {/* Primary Actions - Telegram/TON Wallet style (large buttons) */}
            <View style={styles.actionsSection}>
              {unpaidPaymentsCount > 0 && (
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('PendingPayments'))}
                  style={[styles.pendingBanner, { backgroundColor: `${theme.colors.error}15`, borderRadius: theme.radius.md }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications" size={18} color={theme.colors.error} />
                  <Text style={[styles.pendingText, { color: theme.colors.error }]}>
                    {unpaidPaymentsCount} pending payment{unpaidPaymentsCount > 1 ? 's' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              
              {/* Main Send/Receive buttons - large and prominent */}
              <View style={styles.primaryActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.sendButton, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg }]}
                  onPress={() => navigation.navigate('Send')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.receiveButton, { backgroundColor: theme.colors.success, borderRadius: theme.radius.lg }]}
                  onPress={() => navigation.navigate('Receive')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-down" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Receive</Text>
                </TouchableOpacity>
              </View>

              {/* Secondary Actions - smaller, less prominent */}
              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
                  onPress={() => navigation.navigate('Swap')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal" size={20} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Swap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
                  onPress={() => navigation.navigate('SplitBill')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="people" size={20} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Split</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md }]}
                  onPress={() => handleActionPress(() => navigation.navigate('AddMoney'))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Assets Section - Simplified */}
            <View style={styles.sectionContainer}>
              <Card>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Assets</Text>
                  {tokenRows.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleActionPress(() => navigation.navigate('ManageTokens'))}
                      style={styles.headerIconButton}
                    >
                      <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {tokenRows.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="wallet-outline" size={32} color={theme.colors.muted} />
                    <Text style={[styles.emptyStateText, { color: theme.colors.muted }]}>No assets yet</Text>
                  </View>
                ) : (
                  tokenRows.map((row, index) => (
                    <View 
                      key={`${row.token.symbol}-${row.network}-${row.amount}`} 
                      style={[
                        styles.assetRow,
                        index < tokenRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                      ]}
                    >
                      <View style={styles.assetLeft}>
                        <TokenIcon
                          uri={row.token.logoUri}
                          symbol={row.token.symbol}
                          size={48}
                        />
                        <View style={styles.assetInfo}>
                          <View style={styles.assetNameRow}>
                            <Text style={[styles.assetName, { color: theme.colors.text }]}>{row.token.name}</Text>
                            <View style={[styles.networkTag, { backgroundColor: `${getNetworkColor(row.network)}20` }]}>
                              <Text style={[styles.networkTagText, { color: getNetworkColor(row.network) }]}>
                                {row.network === 'mainnet' ? 'MAIN' : row.network === 'sepolia' ? 'SEP' : 'HOL'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.assetUsd, { color: theme.colors.muted }]}>
                            {hideBalance ? '••••' : row.usd}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.assetAmount, { color: theme.colors.text }]}>
                        {hideBalance ? '••••' : row.amount}
                      </Text>
                    </View>
                  ))
                )}
              </Card>
            </View>

            {/* Scheduled Payments List - Only show if there are payments */}
            <ScheduledPaymentsList />

            {/* Recent Transactions - Simplified */}
            {transactions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Card>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                    <TouchableOpacity 
                      onPress={() => handleActionPress(() => navigation.navigate('TransactionHistory', { address }))}
                      style={styles.headerIconButton}
                    >
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                <TransactionList
                  transactions={transactions.slice(0, 5)}
                  loading={loadingTransactions}
                  onRefresh={() => fetchTransactions(true)}
                  onTransactionPress={(tx) => {
                    navigation.navigate('TransactionDetails', { transaction: tx });
                  }}
                />
                </Card>
              </View>
            )}
          </ScrollView>

          {/* Bottom Tab Bar - Use shared component */}
          <BottomTabBar
            tabs={[
              { key: 'wallet', icon: 'wallet', label: 'Wallet', iconActive: 'wallet' },
              { key: 'tokens', icon: 'grid-outline', label: 'Tokens' },
              { key: 'activity', icon: 'time-outline', label: 'Activity' },
              { key: 'settings', icon: 'settings-outline', label: 'Settings' },
            ]}
            activeTab="wallet"
            onTabPress={(key) => {
              if (key === 'wallet') {
                handleActionPress(() => setSwitcherOpen(true));
              } else if (key === 'tokens') {
                handleActionPress(() => navigation.navigate('ManageTokens'));
              } else if (key === 'activity') {
                handleActionPress(() => navigation.navigate('TransactionHistory', { address }));
              } else if (key === 'settings') {
                handleActionPress(() => navigation.navigate('Settings'));
              }
            }}
          />
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  avatarContainer: {
    // Avatar touch area
  },
  headerCenter: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  walletName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  balanceSection: {
    marginBottom: 24,
  },
  actionsSection: {
    marginBottom: 24,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    // Soft shadow
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sendButton: {
    // Background set dynamically
  },
  receiveButton: {
    // Background set dynamically
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  pendingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assetInfo: {
    flex: 1,
  },
  assetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  networkTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  networkTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  assetUsd: {
    fontSize: 13,
    marginTop: 2,
  },
  assetAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
