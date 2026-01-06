/**
 * ReceiveByBlikMode - Create BLIK payment code
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card';
import { createBlikCode } from '../../services/api/blikService';
import { loginWithWallet } from '../../services/authService';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';

interface Props {
  navigation: any;
}

const SUPPORTED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];
const SUPPORTED_CHAINS = [
  { id: 'sepolia', name: 'Sepolia', icon: '🟦' },
  { id: 'mainnet', name: 'Mainnet', icon: '🔷' },
  { id: 'holesky', name: 'Holesky', icon: '🟣' },
];
const TTL_OPTIONS = [
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
];

export default function ReceiveByBlikMode({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [selectedTTL, setSelectedTTL] = useState(300);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setCreating(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      const result = await createBlikCode(token, {
        amount,
        tokenSymbol: selectedToken,
        preferredChainId: selectedChain || undefined,
        ttlSeconds: selectedTTL,
      });

      navigation.replace('BlikCodeDisplay', {
        code: result.code,
        amount,
        tokenSymbol: selectedToken,
        preferredChainId: selectedChain || undefined,
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      if (error.message === 'MAX_ACTIVE_CODES') {
        Alert.alert(
          'Too Many Active Codes',
          'You have reached the maximum of 10 active payment codes. Please cancel or wait for old codes to expire.'
        );
      } else {
        Alert.alert('Error', 'Failed to create payment code');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAwareScreen style={styles.container} withSafeArea={true}>
      <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10' }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Create a one-time payment code that others can use to send you crypto
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Token</Text>
        <View style={styles.tokenGrid}>
          {SUPPORTED_TOKENS.map((token) => (
            <TouchableOpacity
              key={token}
              style={[
                styles.tokenButton,
                {
                  backgroundColor: selectedToken === token ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: selectedToken === token ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedToken(token)}
            >
              <Text
                style={[
                  styles.tokenText,
                  { color: selectedToken === token ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {token}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferred Network (Optional)</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Select the network you'd like to receive payment on
        </Text>
        <View style={styles.chainGrid}>
          <TouchableOpacity
            style={[
              styles.chainButton,
              {
                backgroundColor: selectedChain === null ? theme.colors.primary + '20' : theme.colors.surface,
                borderColor: selectedChain === null ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setSelectedChain(null)}
          >
            <Text style={[styles.chainName, { color: selectedChain === null ? theme.colors.primary : theme.colors.text }]}>
              Any Network
            </Text>
          </TouchableOpacity>
          {SUPPORTED_CHAINS.map((chain) => (
            <TouchableOpacity
              key={chain.id}
              style={[
                styles.chainButton,
                {
                  backgroundColor: selectedChain === chain.id ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: selectedChain === chain.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedChain(chain.id)}
            >
              <Text style={styles.chainIcon}>{chain.icon}</Text>
              <Text style={[styles.chainName, { color: selectedChain === chain.id ? theme.colors.primary : theme.colors.text }]}>
                {chain.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expires In</Text>
        <View style={styles.ttlGrid}>
          {TTL_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.ttlButton,
                {
                  backgroundColor: selectedTTL === option.value ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: selectedTTL === option.value ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedTTL(option.value)}
            >
              <Text
                style={[
                  styles.ttlText,
                  { color: selectedTTL === option.value ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          The payment code will expire after {selectedTTL / 60} minutes. You can cancel it anytime before it's used.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: !amount || creating ? theme.colors.border : theme.colors.success,
            },
          ]}
          onPress={handleCreate}
          disabled={!amount || creating}
          activeOpacity={0.8}
        >
          {creating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Generate Code</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    marginBottom: 12,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  hint: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    paddingVertical: 12,
    textAlign: 'center',
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tokenButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chainGrid: {
    gap: 8,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  chainIcon: {
    fontSize: 18,
  },
  chainName: {
    fontSize: 12,
    fontWeight: '500',
  },
  ttlGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  ttlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  ttlText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  button: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 20,
  },
});
