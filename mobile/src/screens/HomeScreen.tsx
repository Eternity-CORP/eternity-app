import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { getUnpaidCount } from '../services/pendingPaymentsService'
import { useFocusEffect } from '@react-navigation/native'
import { isBalanceHidden } from '../services/privacySettingsService'
import { getSelectedNetwork } from '../services/networkService'
import type { Network } from '../config/env'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { activeAccount, createAccount } = useWallet();
  const { theme } = useTheme();
  const address = activeAccount?.address || '';
  const [balanceEth, setBalanceEth] = useState<string>('0.000000');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [usdTotal, setUsdTotal] = useState<number>(0);
  const [tokenRows, setTokenRows] = useState<{ token: TokenInfo | { name: string; symbol: string; address: string; decimals: number; logoUri: string }, amount: string, usd: string }[]>([]);
  const [unpaidPaymentsCount, setUnpaidPaymentsCount] = useState<number>(0);
  const [hideBalance, setHideBalance] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

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

  // Load current network
  useEffect(() => {
    const loadNetwork = async () => {
      const network = await getSelectedNetwork();
      setCurrentNetwork(network);
    };
    loadNetwork();

    // Re-check when screen comes into focus
    const interval = setInterval(loadNetwork, 5000);
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

  // Load unpaid payments count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadUnpaidCount = async () => {
        const count = await getUnpaidCount();
        setUnpaidPaymentsCount(count);
      };
      loadUnpaidCount();
    }, [])
  );

  useEffect(() => {
    const run = async () => {
      if (!address) return;
      const prefs = await getTokenPreferences();
      const ethPrice = await getEthUsdPrice();
      const visible = new Set(prefs.visibleSymbols);

      const baseTokens: TokenInfo[] = SUPPORTED_TOKENS.filter(t => visible.has(t.symbol));
      const customTokens = prefs.customTokens.filter(t => visible.has(t.symbol));

      const rows: { token: any; amount: string; usd: string }[] = [];
      let totalUsd = 0;

      // ETH first
      const ethAmount = Number(balanceEth || '0');
      const ethUsd = ethAmount * (ethPrice || 0);
      rows.push({ token: { name: 'Ethereum', symbol: 'ETH', address: '', decimals: 18, logoUri: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' }, amount: `${balanceEth} ETH`, usd: `$${ethUsd.toFixed(2)}` });
      totalUsd += ethUsd;

      // ERC-20 tokens
      for (const token of [...baseTokens, ...customTokens]) {
        // Get token address for current network
        const addr = getTokenAddressForNetwork(token as TokenInfo, defaultNetwork);

        // Skip tokens that don't exist on current network
        if (!addr || addr.length === 0) {
          console.log(`⏭️  Skipping ${token.symbol} - not available on ${defaultNetwork}`);
          continue;
        }

        try {
          console.log(`🪙 Loading ${token.symbol} balance from ${addr.slice(0, 6)}...${addr.slice(-4)}`);
          const balBN = await getTokenBalance(addr, address, defaultNetwork);
          const amountNum = Number(ethers.utils.formatUnits(balBN, token.decimals));

          // Only add tokens with non-zero balance
          if (amountNum > 0) {
            const price = await getTokenUsdPrice(token.symbol);
            const usd = amountNum * price;
            rows.push({ token, amount: `${amountNum.toFixed(6)} ${token.symbol}`, usd: `$${usd.toFixed(2)}` });
            totalUsd += usd;
            console.log(`✅ ${token.symbol}: ${amountNum.toFixed(6)} ($${usd.toFixed(2)})`);
          } else {
            console.log(`ℹ️  ${token.symbol}: 0 balance (hidden)`);
          }
        } catch (e: any) {
          console.warn(`❌ Failed to load ${token.symbol} balance: ${e.message}`);
        }
      }

      setTokenRows(rows);
      setUsdTotal(totalUsd);
    };

    run();
    const timer = setInterval(run, 30000);
    return () => clearInterval(timer);
  }, [address, balanceEth]);

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

  const handleCopy = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
    } catch (e) {
      console.warn('Copy failed', e);
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

  return (
    <>
      <AccountSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <DevModeBadge />
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[theme.colors.background, '#0C0F28']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
            <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: 56 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar address={address} size={44} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: theme.colors.text, fontSize: theme.typography.fontSizes.lg, fontFamily: theme.typography.fontFamilies.bold }}>Eternity Wallet</Text>
                      <View style={{
                        backgroundColor: currentNetwork === 'mainnet' ? '#29B6AF20' : '#FF980020',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: currentNetwork === 'mainnet' ? '#29B6AF' : '#FF9800'
                      }}>
                        <Text style={{
                          color: currentNetwork === 'mainnet' ? '#29B6AF' : '#FF9800',
                          fontSize: 10,
                          fontWeight: '600'
                        }}>
                          {currentNetwork === 'mainnet' ? 'MAINNET' : currentNetwork === 'sepolia' ? 'SEPOLIA' : 'HOLESKY'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{activeAccount?.name || 'No Account'}</Text>
                    <TouchableOpacity onPress={handleCopy}><Text style={{ color: theme.colors.muted, fontSize: 12 }}>{truncated}</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('ManageTokens')} accessibilityRole="button">
                    <Ionicons name="list" size={22} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSwitcherOpen(true)} accessibilityRole="button">
                    <Ionicons name="person-circle-outline" size={26} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Settings')} accessibilityRole="button">
                    <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}>
              <BalanceCard amount={usdTotal} currency="USD" subtitle="Portfolio Balance" />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: theme.spacing.sm }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddMoney')}
                  style={{ flex: 1, backgroundColor: theme.colors.success, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Add Money</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={{ backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 }}
                >
                  <Ionicons name="refresh" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>Actions</Text>
                  {unpaidPaymentsCount > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('PendingPayments')}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.error + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                    >
                      <Ionicons name="notifications" size={16} color={theme.colors.error} />
                      <Text style={{ color: theme.colors.error, fontSize: 12, fontWeight: '600' }}>
                        {unpaidPaymentsCount} ожидает оплаты
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
                  <View style={{ alignItems: 'center', width: '24%' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Send')} accessibilityRole="button">
                      <Ionicons name="arrow-up-circle" size={36} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.text, marginTop: 6 }}>Send</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '24%' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('Receive')} accessibilityRole="button">
                      <Ionicons name="arrow-down-circle" size={36} color={theme.colors.secondary} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.text, marginTop: 6 }}>Receive</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '24%' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('SplitBill')} accessibilityRole="button">
                      <Ionicons name="receipt-outline" size={36} color={theme.colors.accent} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.text, marginTop: 6 }}>Split Bill</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '24%' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('SchedulePayment')} accessibilityRole="button">
                      <Ionicons name="time-outline" size={36} color={theme.colors.warning} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.colors.text, marginTop: 6 }}>Schedule</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>Assets</Text>
                  <Button title="Manage" variant="outline" onPress={() => navigation.navigate('ManageTokens')} />
                </View>
                {tokenRows.length === 0 ? (
                  <Text style={{ color: theme.colors.muted, textAlign: 'center', paddingVertical: theme.spacing.md }}>No assets</Text>
                ) : (
                  tokenRows.map((row) => (
                    <View key={`${row.token.symbol}-${row.token.address}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {/* Logo placeholder as a colored circle */}
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface }} />
                        <View>
                          <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>{row.token.name} ({row.token.symbol})</Text>
                          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{hideBalance ? '***' : row.usd}</Text>
                        </View>
                      </View>
                      <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamilies.medium }}>{hideBalance ? '***' : row.amount}</Text>
                    </View>
                  ))
                )}
              </Card>
            </View>

            {/* Scheduled Payments List */}
            <ScheduledPaymentsList />

            <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 18, fontFamily: theme.typography.fontFamilies.bold }}>Recent Transactions</Text>
                  <Button title="View All" variant="outline" onPress={() => navigation.navigate('TransactionHistory', { address })} />
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
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  networkBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  smallButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceSubtext: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: 80,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  assetValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
