import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MainStackParamList } from '../navigation/MainNavigator';
import { getETHBalance, formatBalance, autoRefreshBalance } from '../services/blockchain/balanceService';
import { defaultNetwork } from '../constants/rpcUrls';
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
import DevModeBadge from '../components/common/DevModeBadge'
import ShardBadge from '../components/common/ShardBadge'
import ActionButton from '../components/common/ActionButton'
import { getUnpaidCount } from '../services/pendingPaymentsService'
import { useFocusEffect } from '@react-navigation/native'
import { isBalanceHidden } from '../services/privacySettingsService'
import { getSelectedNetwork } from '../services/networkService'
import { getNetworkMode, type NetworkMode } from '../services/networkModeService'
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

    // Re-check when screen comes into focus
    const interval = setInterval(loadNetworkAndMode, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const init = async () => {
      if (!address) return;
      unsubscribe = autoRefreshBalance(address, (bn) => setBalanceEth(formatBalance(bn)), 30000, defaultNetwork);
    };
    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [address]);

  useEffect(() => {
    fetchTransactions();
  }, [address]);

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

      // Scan all supported networks for a unified portfolio view
      const networks: Network[] = ['mainnet', 'sepolia', 'holesky'];
      
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

    run();
    const timer = setInterval(run, 30000);
    return () => clearInterval(timer);
  }, [address, currentNetwork]);

  const fetchTransactions = async (forceRefresh = false) => {
    if (!address) return;

    try {
      setLoadingTransactions(true);
      console.log(`📜 Loading transaction history (force: ${forceRefresh})...`);

      const txHistory = await getTransactionHistory(address, { network: defaultNetwork, page: 1, offset: 50, forceRefresh });

      setTransactions(txHistory);

      if (txHistory.length === 0) {
        console.log(`ℹ️  No transactions to display`);
      } else {
        console.log(`✅ Loaded ${txHistory.length} transactions`);
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
    if (!address) return;
    console.log('🔄 [HomeScreen] Refreshing balance and transactions...');
    // Clear transaction cache first
    await clearTransactionCache(address, defaultNetwork);
    const bn = await getETHBalance(address, defaultNetwork);
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
    if (!address) return;
    console.log('=== NETWORK DIAGNOSTICS ===');
    const networkDiag = await diagnoseNetwork(defaultNetwork);
    const balanceTest = await testBalanceRetrieval(address, defaultNetwork);
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
      <DevModeBadge />
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
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => handleActionPress(() => navigation.navigate('Profile'))}
                style={styles.avatarContainer}
              >
                <Avatar address={address} size={44} />
              </TouchableOpacity>
              
              <View style={styles.headerCenter}>
                <TouchableOpacity onPress={handleCopyNickname}>
                  <Text style={[styles.walletName, { color: theme.colors.text }]}>
                    {userProfile?.nickname || 'Eternity Wallet'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleCopyAddress}
                  style={styles.addressRow}
                >
                  <Text style={[styles.addressText, { color: theme.colors.muted }]}>
                    {truncated}
                  </Text>
                  <Ionicons name="copy-outline" size={12} color={theme.colors.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.headerRight}>
                {/* Mode & Network Badge */}
                <TouchableOpacity 
                  style={[styles.networkBadge, { backgroundColor: currentMode === 'live' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)' }]}
                  onPress={() => handleActionPress(() => navigation.navigate('Settings'))}
                >
                  <View style={[styles.networkDot, { backgroundColor: currentMode === 'live' ? '#4CAF50' : '#FF9800' }]} />
                  <Text style={[styles.networkText, { color: currentMode === 'live' ? '#4CAF50' : '#FF9800' }]}>
                    {currentMode === 'live' ? 'Live' : 'Demo'}
                  </Text>
                </TouchableOpacity>
                <ShardBadge />
              </View>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceSection}>
              <BalanceCard amount={usdTotal} currency="USD" subtitle="Portfolio Balance" />
              
              {/* Quick Actions Row */}
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('AddMoney'))}
                  style={[styles.addMoneyButton, { backgroundColor: theme.colors.success }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addMoneyText}>Add Money</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(handleRefresh)}
                  style={[styles.refreshButton, { backgroundColor: theme.colors.surface }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons Grid - Trust Wallet Style */}
            <View style={styles.actionsSection}>
              {unpaidPaymentsCount > 0 && (
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('PendingPayments'))}
                  style={[styles.pendingBanner, { backgroundColor: `${theme.colors.error}15` }]}
                >
                  <Ionicons name="notifications" size={18} color={theme.colors.error} />
                  <Text style={[styles.pendingText, { color: theme.colors.error }]}>
                    {unpaidPaymentsCount} pending payment{unpaidPaymentsCount > 1 ? 's' : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              
              <View style={styles.actionsGrid}>
                <ActionButton
                  icon="arrow-up"
                  label="Send"
                  onPress={() => navigation.navigate('Send')}
                  color={theme.colors.primary}
                  backgroundColor={`${theme.colors.primary}15`}
                />
                <ActionButton
                  icon="arrow-down"
                  label="Receive"
                  onPress={() => navigation.navigate('Receive')}
                  color={theme.colors.success}
                  backgroundColor={`${theme.colors.success}15`}
                />
                <ActionButton
                  icon="swap-horizontal"
                  label="Swap"
                  onPress={() => navigation.navigate('Swap')}
                  color={theme.colors.secondary}
                  backgroundColor={`${theme.colors.secondary}15`}
                />
                <ActionButton
                  icon="people"
                  label="Split"
                  onPress={() => navigation.navigate('SplitBill')}
                  color={theme.colors.accent}
                  backgroundColor={`${theme.colors.accent}15`}
                />
              </View>
            </View>

            {/* Assets Section */}
            <View style={styles.sectionContainer}>
              <Card>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Assets</Text>
                  <TouchableOpacity 
                    onPress={() => handleActionPress(() => navigation.navigate('ManageTokens'))}
                    style={[styles.manageButton, { backgroundColor: theme.colors.surface }]}
                  >
                    <Text style={[styles.manageButtonText, { color: theme.colors.textSecondary }]}>Manage</Text>
                  </TouchableOpacity>
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
                        <View style={[styles.tokenLogo, { backgroundColor: theme.colors.surface }]}>
                          <Image source={{ uri: row.token.logoUri }} style={styles.tokenLogoImage} />
                        </View>
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

            {/* Scheduled Payments List */}
            <ScheduledPaymentsList />

            {/* Recent Transactions */}
            <View style={styles.sectionContainer}>
              <Card>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                  <TouchableOpacity 
                    onPress={() => handleActionPress(() => navigation.navigate('TransactionHistory', { address }))}
                    style={[styles.manageButton, { backgroundColor: theme.colors.surface }]}
                  >
                    <Text style={[styles.manageButtonText, { color: theme.colors.textSecondary }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                <TransactionList
                  transactions={transactions.slice(0, 5)}
                  loading={loadingTransactions}
                  onRefresh={() => fetchTransactions(true)}
                  onTransactionPress={(tx) => {
                    const url = `${getExplorerUrl(defaultNetwork)}/tx/${tx.hash}`;
                    Linking.openURL(url);
                  }}
                />
              </Card>
            </View>
          </ScrollView>

          {/* Bottom Tab Bar with Blur */}
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}
            >
              <View style={styles.bottomBarContent}>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => setSwitcherOpen(true))}
                  style={styles.tabItem}
                >
                  <Ionicons name="wallet" size={24} color={theme.colors.primary} />
                  <Text style={[styles.tabLabel, { color: theme.colors.primary }]}>Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('ManageTokens'))}
                  style={styles.tabItem}
                >
                  <Ionicons name="grid-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Tokens</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('TransactionHistory', { address }))}
                  style={styles.tabItem}
                >
                  <Ionicons name="time-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('Settings'))}
                  style={styles.tabItem}
                >
                  <Ionicons name="settings-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Settings</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          ) : (
            <View style={[
              styles.bottomBarAndroid, 
              { backgroundColor: theme.colors.card, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }
            ]}>
              <View style={styles.bottomBarContent}>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => setSwitcherOpen(true))}
                  style={styles.tabItem}
                >
                  <Ionicons name="wallet" size={24} color={theme.colors.primary} />
                  <Text style={[styles.tabLabel, { color: theme.colors.primary }]}>Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('ManageTokens'))}
                  style={styles.tabItem}
                >
                  <Ionicons name="grid-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Tokens</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('TransactionHistory', { address }))}
                  style={styles.tabItem}
                >
                  <Ionicons name="time-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleActionPress(() => navigation.navigate('Settings'))}
                  style={styles.tabItem}
                >
                  <Ionicons name="settings-outline" size={22} color={theme.colors.muted} />
                  <Text style={[styles.tabLabel, { color: theme.colors.muted }]}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    marginBottom: 20,
    gap: 12,
  },
  avatarContainer: {
    // Avatar touch area
  },
  headerCenter: {
    flex: 1,
  },
  walletName: {
    fontSize: 18,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  balanceSection: {
    marginBottom: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  addMoneyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  addMoneyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsSection: {
    marginBottom: 20,
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
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  manageButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tokenLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomBarAndroid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
