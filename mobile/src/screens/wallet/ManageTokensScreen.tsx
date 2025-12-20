import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { SUPPORTED_TOKENS, TokenInfo } from '../../constants/tokens';
import { toggleTokenVisibility, getTokenPreferences, addCustomToken, removeCustomToken } from '../../services/state/tokenPreferences';
import { ERC20_ABI } from '../../constants/abis';
import { getProvider } from '../../services/blockchain/ethereumProvider';
import { ethers } from 'ethers';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';

type Props = NativeStackScreenProps<MainStackParamList, 'ManageTokens'>;

export default function ManageTokensScreen({ navigation }: Props) {
  const { theme } = useTheme();
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Manage Tokens</Text>
        <View style={{ width: 24 }} />
      </View>

      {prefsLoading ? (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      ) : (
        <>
          {/* Supported Tokens */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Supported Tokens</Text>
            </View>
            {SUPPORTED_TOKENS.map((t) => (
              <Card key={t.symbol} style={styles.card}>
                <View style={styles.tokenRow}>
                  <View style={styles.tokenLeft}>
                    {t.logoUri ? (
                      <Image source={{ uri: t.logoUri }} style={styles.logo} />
                    ) : (
                      <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Ionicons name="logo-usd" size={16} color={theme.colors.primary} />
                      </View>
                    )}
                    <View>
                      <Text style={[styles.tokenName, { color: theme.colors.text }]}>{t.name}</Text>
                      <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]}>{t.symbol}</Text>
                    </View>
                  </View>
                  <Switch
                    value={visibleSymbols.includes(t.symbol)}
                    onValueChange={() => handleToggle(t.symbol)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                    thumbColor={visibleSymbols.includes(t.symbol) ? theme.colors.primary : theme.colors.surface}
                  />
                </View>
              </Card>
            ))}
          </View>

          {/* Custom Tokens */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Custom Tokens</Text>
            </View>
            {customTokens.length === 0 ? (
              <Card style={styles.card}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No custom tokens added yet
                </Text>
              </Card>
            ) : (
              customTokens.map((t) => (
                <Card key={t.address} style={styles.card}>
                  <View style={styles.tokenRow}>
                    <View style={styles.tokenLeft}>
                      {t.logoUri ? (
                        <Image source={{ uri: t.logoUri }} style={styles.logo} />
                      ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Ionicons name="logo-usd" size={16} color={theme.colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tokenName, { color: theme.colors.text }]}>{t.name}</Text>
                        <Text style={[styles.tokenSymbol, { color: theme.colors.textSecondary }]}>{t.symbol}</Text>
                      </View>
                    </View>
                    <View style={styles.tokenActions}>
                      <Switch
                        value={visibleSymbols.includes(t.symbol)}
                        onValueChange={() => handleToggle(t.symbol)}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                        thumbColor={visibleSymbols.includes(t.symbol) ? theme.colors.primary : theme.colors.surface}
                      />
                      <TouchableOpacity onPress={() => handleRemoveCustom(t.address)} style={styles.removeButton}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>

          {/* Add Custom Token */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Add Custom Token</Text>
            </View>
            <Card style={styles.card}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Contract Address</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                placeholder="0x... ERC-20 address"
                placeholderTextColor={theme.colors.textSecondary}
                value={newTokenAddress}
                onChangeText={setNewTokenAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                  adding && { opacity: 0.6 },
                ]}
                onPress={handleAddToken}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Add Token</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          </View>

          <View style={styles.spacer} />
        </>
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
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tokenActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenSymbol: {
    fontSize: 12,
    marginTop: 2,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    padding: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    height: 40,
  },
});
