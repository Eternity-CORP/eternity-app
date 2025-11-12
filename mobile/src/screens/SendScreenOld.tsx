import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { estimateGas, sendETH } from '../services/blockchain/transactionService';
import { defaultNetwork } from '../constants/rpcUrls';
import { ethers } from 'ethers';
import { SUPPORTED_TOKENS, TokenInfo, getTokenAddressForNetwork } from '../constants/tokens';
import { getTokenPreferences } from '../services/state/tokenPreferences';
import { getTokenBalance, estimateTokenGas, sendToken } from '../services/blockchain/tokenService';

type Props = NativeStackScreenProps<MainStackParamList, 'Send'>;

export default function SendScreen({ navigation }: Props) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [gasFeeEth, setGasFeeEth] = useState<string>('0');
  const [sending, setSending] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ type: 'ETH' } | { type: 'TOKEN'; token: TokenInfo; address: string }>(() => ({ type: 'ETH' }));
  const [assetBalance, setAssetBalance] = useState<string>('0');

  useEffect(() => {
    const initAssets = async () => {
      const prefs = await getTokenPreferences();
      const visible = new Set(prefs.visibleSymbols);
      const baseTokens = SUPPORTED_TOKENS.filter(t => visible.has(t.symbol));
      // Default to ETH; user can open dropdown to pick another
      // We could preselect the first token here if needed
    };
    initAssets();
  }, []);

  useEffect(() => {
    const doEstimate = async () => {
      if (!recipient || !amount) { setGasFeeEth('0'); return; }
      if (!ethers.utils.isAddress(recipient)) { setGasFeeEth('0'); return; }
      try {
        setEstimating(true);
        if (selectedAsset.type === 'ETH') {
          const { feeEth } = await estimateGas(recipient, amount, defaultNetwork);
          setGasFeeEth(feeEth);
        } else {
          const { feeEth } = await estimateTokenGas(selectedAsset.address, recipient, amount, defaultNetwork);
          setGasFeeEth(feeEth);
        }
      } catch (e) {
        console.warn('Gas estimation failed', e);
        setGasFeeEth('0');
      } finally {
        setEstimating(false);
      }
    };
    doEstimate();
  }, [recipient, amount, selectedAsset]);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        if (selectedAsset.type === 'ETH') {
          // estimate only displays fee; for balance we'll reuse existing logic elsewhere if needed
          setAssetBalance('');
        } else {
          const acct = await (await import('../services/walletService')).getAddress();
          if (!acct) return;
          const balBN = await getTokenBalance(selectedAsset.address, acct, defaultNetwork);
          const amt = ethers.utils.formatUnits(balBN, selectedAsset.token.decimals);
          setAssetBalance(`${amt} ${selectedAsset.token.symbol}`);
        }
      } catch (e) {
        console.warn('Failed to load asset balance', e);
      }
    };
    loadBalance();
  }, [selectedAsset]);

  const handleSend = async () => {
    try {
      if (!ethers.utils.isAddress(recipient)) {
        Alert.alert('Invalid address', 'Please enter a valid Ethereum address');
        return;
      }
      if (!amount || Number(amount) <= 0) {
        Alert.alert('Invalid amount', 'Please enter a positive amount');
        return;
      }
      setSending(true);
      if (selectedAsset.type === 'ETH') {
        const { txHash, receipt } = await sendETH(recipient, amount, defaultNetwork);
        Alert.alert('Transaction sent', `Hash: ${txHash}`);
        if (receipt) Alert.alert('Confirmed', `Block: ${receipt.blockNumber}`);
      } else {
        const { txHash, receipt } = await sendToken(selectedAsset.address, recipient, amount, defaultNetwork);
        Alert.alert('Token transferred', `Hash: ${txHash}`);
        if (receipt) Alert.alert('Confirmed', `Block: ${receipt.blockNumber}`);
      }
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to send transaction');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipient Address</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="0x... or ENS name"
              value={recipient}
              onChangeText={(t) => setRecipient(t.trim())}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanIcon}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amount</Text>
            <TouchableOpacity onPress={() => setAmount('')}>
              <Text style={styles.maxButton}>CLEAR</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Text style={styles.subtext}>Est. Fee: {estimating ? '...' : `${gasFeeEth} ETH`}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Asset</Text>
          <TouchableOpacity style={styles.assetSelector} onPress={() => setAssetOpen(!assetOpen)}>
            <Text style={styles.assetText}>{selectedAsset.type === 'ETH' ? 'Ethereum (ETH)' : `${selectedAsset.token.name} (${selectedAsset.token.symbol})`}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          {assetOpen && (
            <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 8 }}>
              <TouchableOpacity style={{ padding: 12 }} onPress={() => { setSelectedAsset({ type: 'ETH' }); setAssetOpen(false); }}>
                <Text>Ethereum (ETH)</Text>
              </TouchableOpacity>
              {SUPPORTED_TOKENS.map((t) => {
                const addr = getTokenAddressForNetwork(t, defaultNetwork);
                if (!addr) return null;
                return (
                  <TouchableOpacity key={t.symbol} style={{ padding: 12 }} onPress={() => { setSelectedAsset({ type: 'TOKEN', token: t, address: addr }); setAssetOpen(false); }}>
                    <Text>{t.name} ({t.symbol})</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {selectedAsset.type === 'TOKEN' && !!assetBalance && (
            <Text style={styles.subtext}>Balance: {assetBalance}</Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Memo (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note..."
            value={memo}
            onChangeText={setMemo}
            multiline={true}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!ethers.utils.isAddress(recipient) || !amount || sending) && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={!ethers.utils.isAddress(recipient) || !amount || sending}
        >
          {sending ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.sendButtonText}>{selectedAsset.type === 'ETH' ? 'Send ETH' : `Send ${selectedAsset.token.symbol}`}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maxButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  scanButton: {
    marginLeft: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  scanIcon: {
    fontSize: 24,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  assetSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  assetText: {
    fontSize: 16,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
