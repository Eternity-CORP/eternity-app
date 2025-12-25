import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { SUPPORTED_TOKENS, TokenInfo } from '../../constants/tokens';
import { toggleTokenVisibility, getTokenPreferences, addCustomToken, removeCustomToken } from '../../services/state/tokenPreferences';
import { ERC20_ABI } from '../../constants/abis';
import { getProvider } from '../../services/blockchain/ethereumProvider';
import { ethers } from 'ethers';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import TokenIcon from '../../components/common/TokenIcon';

type Props = NativeStackScreenProps<MainStackParamList, 'ManageTokens'>;

export default function ManageTokensScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [visibleSymbols, setVisibleSymbols] = useState<string[]>([]);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prefs = await getTokenPreferences();
      setVisibleSymbols(prefs.visibleSymbols);
      setCustomTokens(prefs.customTokens);
      setPrefsLoading(false);
    };
    load();
  }, []);

  const handleToggle = async (symbol: string) => {
    const updated = await toggleTokenVisibility(symbol);
    setVisibleSymbols(updated.visibleSymbols);
  };

  const handleRemoveCustom = async (address: string) => {
    const updated = await removeCustomToken(address);
    setCustomTokens(updated.customTokens);
  };

  const handleAddToken = async () => {
    try {
      const addr = newTokenAddress.trim();
      if (!ethers.utils.isAddress(addr)) {
        Alert.alert('Invalid address', 'Please enter a valid ERC-20 contract address');
        return;
      }
      setAdding(true);
      const provider = getProvider();
      const contract = new ethers.Contract(addr, ERC20_ABI, provider);
      let symbol: string = 'TOKEN';
      let decimals: number = 18;
      let name: string = 'Custom Token';
      try { symbol = await contract.symbol(); } catch {}
      try { decimals = await contract.decimals(); } catch {}
      try { name = await contract.name(); } catch {}
      const token: TokenInfo = {
        name,
        symbol,
        address: addr,
        decimals,
        logoUri: '',
      };
      const updated = await addCustomToken(token);
      setCustomTokens(updated.customTokens);
      setVisibleSymbols(updated.visibleSymbols);
      setNewTokenAddress('');
      Alert.alert('Token added', `${symbol} (${decimals} decimals)`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add token');
    } finally {
      setAdding(false);
    }
  };

  return (
    <KeyboardAwareScreen style={[styles.container, { backgroundColor: theme.colors.background }]} withSafeArea={false}>
      {/* Header - Telegram/TON Wallet style */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Manage Tokens</Text>
        <View style={{ width: 24 }} />
      </View>

      {prefsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Supported Tokens Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Supported Tokens</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Toggle visibility for tokens in your wallet
            </Text>
            
            {SUPPORTED_TOKENS.map((t, index) => (
              <Card key={t.symbol} style={[styles.tokenCard, index === 0 && styles.firstCard]}>
                <View style={styles.tokenRow}>
                  <View style={styles.tokenLeft}>
                    <View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.surface }]}>
                      <TokenIcon uri={t.logoUri} symbol={t.symbol} size={40} />
                    </View>
                    <View style={styles.tokenInfo}>
                      <Text style={[styles.tokenName, { color: theme.colors.text }]}>{t.name}</Text>
                      <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]}>{t.symbol}</Text>
                    </View>
                  </View>
                  <Switch
                    value={visibleSymbols.includes(t.symbol)}
                    onValueChange={() => handleToggle(t.symbol)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                    thumbColor={visibleSymbols.includes(t.symbol) ? theme.colors.primary : '#FFFFFF'}
                    ios_backgroundColor={theme.colors.border}
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Custom Tokens Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Custom Tokens</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                  Tokens you've added manually
                </Text>
              </View>
            </View>
            
            {customTokens.length === 0 ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyState}>
                  <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    No custom tokens
                  </Text>
                  <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                    Add tokens by contract address below
                  </Text>
                </View>
              </Card>
            ) : (
              customTokens.map((t, index) => (
                <Card key={t.address} style={[styles.tokenCard, index === 0 && styles.firstCard]}>
                  <View style={styles.tokenRow}>
                    <View style={styles.tokenLeft}>
                      <View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.surface }]}>
                        <TokenIcon uri={t.logoUri} symbol={t.symbol} size={40} />
                      </View>
                      <View style={styles.tokenInfo}>
                        <Text style={[styles.tokenName, { color: theme.colors.text }]} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {t.symbol}
                        </Text>
                        <Text style={[styles.tokenAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {`${t.address.slice(0, 6)}...${t.address.slice(-4)}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.tokenActions}>
                      <Switch
                        value={visibleSymbols.includes(t.symbol)}
                        onValueChange={() => handleToggle(t.symbol)}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '60' }}
                        thumbColor={visibleSymbols.includes(t.symbol) ? theme.colors.primary : '#FFFFFF'}
                        ios_backgroundColor={theme.colors.border}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Remove Token',
                            `Remove ${t.symbol} from your custom tokens?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => handleRemoveCustom(t.address),
                              },
                            ]
                          );
                        }}
                        style={[styles.removeButton, { backgroundColor: theme.colors.error + '15' }]}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>

          {/* Add Custom Token Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Custom Token</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
              Enter an ERC-20 contract address to add a custom token
            </Text>
            
            <Card style={styles.addTokenCard}>
              <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="link-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="0x... ERC-20 contract address"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newTokenAddress}
                  onChangeText={setNewTokenAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.colors.primary },
                  adding && styles.addButtonDisabled,
                ]}
                onPress={handleAddToken}
                disabled={adding || !newTokenAddress.trim()}
                activeOpacity={0.7}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Token</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      )}
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  tokenCard: {
    marginBottom: 8,
    padding: 16,
  },
  firstCard: {
    marginTop: 0,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tokenIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenSymbol: {
    fontSize: 13,
    marginBottom: 2,
  },
  tokenAddress: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  tokenActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  addTokenCard: {
    marginTop: 12,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'monospace',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 40,
  },
});
