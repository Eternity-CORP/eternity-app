import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ethers } from 'ethers';

import { MainStackParamList } from '../navigation/MainNavigator';
import { estimateGas, sendETH } from '../services/blockchain/transactionService';
import { getETHBalance } from '../services/blockchain/balanceService';
import { getSelectedNetwork } from '../services/networkService';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import type { Network } from '../config/env';
import Card from '../components/common/Card';
import SwipeToConfirm from '../components/SwipeToConfirm';
import { notifyTransactionSent } from '../services/notificationService';
import { KeyboardAwareScreen } from '../components/common/KeyboardAwareScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'Send'>;

const EMOJI_LIST = ['☕️', '🍕', '🍺', '🎉', '🎁', '❤️', '🙏', '💰', '🚀', '🔥'];

export default function SendScreenNew({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const confettiRef = useRef<any>(null);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [gasFeeEth, setGasFeeEth] = useState<string>('0');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

  // Load network and balance on mount
  useEffect(() => {
    const loadNetworkAndBalance = async () => {
      if (!activeAccount?.address) return;

      try {
        setLoadingBalance(true);
        const network = await getSelectedNetwork();
        setCurrentNetwork(network);
        const bal = await getETHBalance(activeAccount.address, network);
        setBalance(bal);
      } catch (e) {
        console.error('Failed to load balance:', e);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadNetworkAndBalance();
  }, [activeAccount?.address]);

  // Estimate gas when recipient and amount change
  useEffect(() => {
    const doEstimate = async () => {
      if (!recipient || !amount) {
        setGasFeeEth('0');
        return;
      }
      if (!ethers.utils.isAddress(recipient)) {
        setGasFeeEth('0');
        return;
      }
      try {
        setEstimating(true);
        const { feeEth } = await estimateGas(recipient, amount, currentNetwork);
        setGasFeeEth(feeEth);
      } catch (e) {
        console.warn('Gas estimation failed', e);
        setGasFeeEth('0');
      } finally {
        setEstimating(false);
      }
    };
    doEstimate();
  }, [recipient, amount]);

  const handleSend = async () => {
    try {
      if (!activeAccount) {
        Alert.alert('Error', 'Wallet not found');
        return;
      }

      if (!ethers.utils.isAddress(recipient)) {
        Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
        return;
      }

      if (!amount || Number(amount) <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a positive amount');
        return;
      }

      Keyboard.dismiss();
      setSending(true);

      const { txHash, receipt } = await sendETH(recipient, amount, currentNetwork);
      console.log('Transaction sent:', txHash);

      // Send notification
      await notifyTransactionSent(`${amount} ETH`, recipient, txHash);

      // Show confetti!
      confettiRef.current?.start();

      // Show success message
      const friendlyMessage = message || 'Payment';
      Alert.alert(
        '🎉 Success!',
        `${selectedEmoji} ${friendlyMessage}\n\nSent ${amount} ETH to ${recipient.slice(
          0,
          6
        )}...${recipient.slice(-4)}\n\nTx: ${txHash.slice(0, 10)}...`,
        [
          {
            text: 'Done',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Failed to send transaction');
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (selectedEmoji === emoji) {
      setSelectedEmoji('');
    } else {
      setSelectedEmoji(emoji);
    }
  };

  const hasInsufficientFunds = () => {
    if (!amount || Number(amount) <= 0) return false;

    try {
      const amountWei = ethers.utils.parseEther(amount);
      const gasFeeWei = ethers.utils.parseEther(gasFeeEth || '0');
      const totalNeeded = amountWei.add(gasFeeWei);

      return balance.lt(totalNeeded);
    } catch {
      return false;
    }
  };

  const isFormValid = () => {
    return (
      ethers.utils.isAddress(recipient) &&
      amount &&
      Number(amount) > 0 &&
      !sending &&
      !hasInsufficientFunds()
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
      />

      <KeyboardAwareScreen
        withSafeArea={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Send Money</Text>
          <View style={{ width: 24 }} />
        </View>

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="paper-plane" size={36} color={theme.colors.primary} />
            </View>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Send ETH to any address
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Fast • Secure • Low fees
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recipient</Text>

          <View
            style={[
              styles.inputContainer,
              {
                borderColor: recipient
                  ? ethers.utils.isAddress(recipient)
                    ? theme.colors.success
                    : theme.colors.error
                  : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="0x... wallet address"
              placeholderTextColor={theme.colors.textSecondary}
              value={recipient}
              onChangeText={(t) => setRecipient(t.trim())}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {recipient && !ethers.utils.isAddress(recipient) && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Invalid address
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount (ETH)</Text>

          <View
            style={[
              styles.amountInputContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>Ξ</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.feeRow}>
            <View style={styles.feeItem}>
              <Ionicons name="flash-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.feeText, { color: theme.colors.textSecondary }]}>
                Gas: {estimating ? '...' : `~${gasFeeEth} ETH`}
              </Text>
            </View>
          </View>

          {/* Balance info */}
          <View style={[styles.balanceRow, { marginTop: 8 }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
              Your balance:
            </Text>
            <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
              {loadingBalance ? '...' : `${ethers.utils.formatEther(balance)} ETH`}
            </Text>
          </View>

          {/* Insufficient funds warning */}
          {hasInsufficientFunds() && (
            <View style={[styles.warningBox, { backgroundColor: theme.colors.error + '20', marginTop: 12 }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={[styles.warningText, { color: theme.colors.error }]}>
                Insufficient balance. You need {ethers.utils.formatEther(
                  ethers.utils.parseEther(amount).add(ethers.utils.parseEther(gasFeeEth || '0'))
                )} ETH (including gas)
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Add a message (optional)
          </Text>

          <TextInput
            style={[
              styles.messageInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="e.g., For coffee, Thank you, etc."
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            maxLength={100}
          />

          <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
            {message.length}/100
          </Text>

          <Text
            style={[styles.emojiTitle, { color: theme.colors.text, marginTop: 16, marginBottom: 12 }]}
          >
            Pick an emoji
          </Text>

          <View style={styles.emojiGrid}>
            {EMOJI_LIST.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor:
                      selectedEmoji === emoji
                        ? theme.colors.primary + '30'
                        : theme.colors.surface,
                    borderColor:
                      selectedEmoji === emoji ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {message && (
          <Card style={[styles.previewCard, { backgroundColor: theme.colors.primary + '10' }]}>
            <View style={styles.previewRow}>
              <Ionicons name="chatbox-ellipses" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: theme.colors.text }]}>Preview</Text>
                <Text style={[styles.previewText, { color: theme.colors.textSecondary }]}>
                  {selectedEmoji} {message}
                </Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.swipeContainer}>
          <SwipeToConfirm
            onConfirm={handleSend}
            text={sending ? 'Sending...' : 'Slide to send'}
            disabled={!isFormValid() || sending}
            backgroundColor={theme.colors.success}
            thumbColor="#FFFFFF"
            textColor="#FFFFFF"
          />
        </View>

        <View style={styles.spacer} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
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
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  feeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeText: {
    fontSize: 13,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  emojiTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  previewCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 20,
  },
  swipeContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  spacer: {
    height: 20,
  },
});
