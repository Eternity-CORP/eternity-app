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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import { createBlikCode } from '../services/api/blikService';
import { loginWithWallet } from '../services/authService';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'CreateBlikCode'>;

const SUPPORTED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];
const SUPPORTED_CHAINS = [
  { id: 'sepolia', name: 'Sepolia', icon: '🟦' },
  { id: 'mainnet', name: 'Mainnet', icon: '🔷' },
  { id: 'holesky', name: 'Holesky', icon: '🟣' },
];
const TTL_OPTIONS = [
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
];

export default function CreateBlikCodeScreen({ navigation }: Props) {
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
      const token = await loginWithWallet(activeAccount.address, 10000);

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

      // Navigate to display screen
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
    <KeyboardAwareScreen
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      withSafeArea={true}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Create Blik Code</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10', marginHorizontal: 16, marginBottom: 16 }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Create a one-time payment code that others can use to send you crypto
        </Text>
      </View>

      {/* Amount */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
        <View
          style={[
            styles.amountInputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
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

      {/* Token */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Token</Text>
        <View style={styles.tokenGrid}>
          {SUPPORTED_TOKENS.map(token => (
            <TouchableOpacity
              key={token}
              style={[
                styles.tokenButton,
                {
                  backgroundColor: selectedToken === token
                    ? theme.colors.primary + '20'
                    : theme.colors.surface,
                  borderColor: selectedToken === token
                    ? theme.colors.primary
                    : theme.colors.border,
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

      {/* Preferred Network (Optional) */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Preferred Network (Optional)
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Select the network you'd like to receive payment on
        </Text>
        <View style={styles.chainGrid}>
          <TouchableOpacity
            style={[
              styles.chainButton,
              {
                backgroundColor: selectedChain === null
                  ? theme.colors.primary + '20'
                  : theme.colors.surface,
                borderColor: selectedChain === null
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
            onPress={() => setSelectedChain(null)}
          >
            <Text
              style={[
                styles.chainName,
                { color: selectedChain === null ? theme.colors.primary : theme.colors.text },
              ]}
            >
              Any Network
            </Text>
          </TouchableOpacity>
          {SUPPORTED_CHAINS.map(chain => (
            <TouchableOpacity
              key={chain.id}
              style={[
                styles.chainButton,
                {
                  backgroundColor: selectedChain === chain.id
                    ? theme.colors.primary + '20'
                    : theme.colors.surface,
                  borderColor: selectedChain === chain.id
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedChain(chain.id)}
            >
              <Text style={styles.chainIcon}>{chain.icon}</Text>
              <Text
                style={[
                  styles.chainName,
                  { color: selectedChain === chain.id ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {chain.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Expires In */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expires In</Text>
        <View style={styles.ttlGrid}>
          {TTL_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.ttlButton,
                {
                  backgroundColor: selectedTTL === option.value
                    ? theme.colors.primary + '20'
                    : theme.colors.surface,
                  borderColor: selectedTTL === option.value
                    ? theme.colors.primary
                    : theme.colors.border,
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

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          The payment code will expire after {selectedTTL / 60} minutes. You can cancel it anytime before it's used.
        </Text>
      </View>

      {/* Create Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: (!amount || creating)
                ? theme.colors.border
                : theme.colors.success,
            },
          ]}
          onPress={handleCreate}
          disabled={!amount || creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Generate Code</Text>
          )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
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
    borderRadius: 8,
  },
  hint: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 16,
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chainGrid: {
    gap: 8,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  chainIcon: {
    fontSize: 18,
  },
  chainName: {
    fontSize: 14,
    fontWeight: '600',
  },
  ttlGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  ttlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  ttlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 8,
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
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spacer: {
    height: 20,
  },
});
