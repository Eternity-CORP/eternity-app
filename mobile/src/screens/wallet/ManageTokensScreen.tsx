import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Switch, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { SUPPORTED_TOKENS, TokenInfo } from '../../constants/tokens';
import { toggleTokenVisibility, getTokenPreferences, addCustomToken, removeCustomToken } from '../../services/state/tokenPreferences';
import { ERC20_ABI } from '../../constants/abis';
import { getProvider } from '../../services/blockchain/ethereumProvider';
import { ethers } from 'ethers';

 type Props = NativeStackScreenProps<MainStackParamList, 'ManageTokens'>;

export default function ManageTokensScreen({ navigation }: Props) {
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backButton}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tokens</Text>
        <View style={{ width: 50 }} />
      </View>

      {prefsLoading ? (
        <View style={{ padding: 20 }}><ActivityIndicator /></View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supported</Text>
            {SUPPORTED_TOKENS.map((t) => (
              <View key={t.symbol} style={styles.tokenRow}>
                <View style={styles.tokenLeft}>
                  {t.logoUri ? <Image source={{ uri: t.logoUri }} style={styles.logo} /> : <View style={styles.logoPlaceholder} />}
                  <View>
                    <Text style={styles.tokenName}>{t.name}</Text>
                    <Text style={styles.tokenSymbol}>{t.symbol}</Text>
                  </View>
                </View>
                <Switch
                  value={visibleSymbols.includes(t.symbol)}
                  onValueChange={() => handleToggle(t.symbol)}
                />
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Tokens</Text>
            {customTokens.length === 0 ? (
              <Text style={styles.emptyText}>No custom tokens</Text>
            ) : (
              customTokens.map((t) => (
                <View key={t.address} style={styles.tokenRow}>
                  <View style={styles.tokenLeft}>
                    {t.logoUri ? <Image source={{ uri: t.logoUri }} style={styles.logo} /> : <View style={styles.logoPlaceholder} />}
                    <View>
                      <Text style={styles.tokenName}>{t.name}</Text>
                      <Text style={styles.tokenSymbol}>{t.symbol}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Switch
                      value={visibleSymbols.includes(t.symbol)}
                      onValueChange={() => handleToggle(t.symbol)}
                    />
                    <TouchableOpacity onPress={() => handleRemoveCustom(t.address)}>
                      <Text style={{ color: '#FF3B30' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Custom Token</Text>
            <TextInput
              style={styles.input}
              placeholder="0x... ERC-20 address"
              value={newTokenAddress}
              onChangeText={setNewTokenAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.button, adding && styles.buttonDisabled]} onPress={handleAddToken} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add Token</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { fontSize: 16, color: '#007AFF' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', margin: 20, marginTop: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tokenName: { fontSize: 16, fontWeight: '600' },
  tokenSymbol: { fontSize: 12, color: '#666' },
  logo: { width: 32, height: 32, borderRadius: 16 },
  logoPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee' },
  emptyText: { fontSize: 14, color: '#999' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
