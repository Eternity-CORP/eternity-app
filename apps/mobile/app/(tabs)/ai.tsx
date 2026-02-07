/**
 * AI Chat Screen
 * Main AI interface with chat, suggestions, and streaming
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAiChat } from '@/src/hooks/useAiChat';
import {
  ChatBubble,
  ChatInput,
  TypingIndicator,
  SuggestionCard,
  TransactionCard,
  BlikCard,
  SwapCard,
  ChatBackground,
  type PendingTransaction,
  type PendingBlik,
  type PendingBlikPay,
  type PendingSwap,
} from '@/src/components/ai';
import { aiChat } from '@/src/constants/ai-chat-theme';
import { theme } from '@/src/constants/theme';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { sendTransaction } from '@/src/services/send-service';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { saveContactThunk, loadContactsThunk } from '@/src/store/slices/contacts-slice';
import type { ChatMessage, AiSuggestion } from '@/src/services/ai-service';

export default function AiScreen() {
  const {
    messages,
    suggestions,
    status,
    isConnected,
    isStreaming,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    pendingSwap,
    error,
    sendMessage,
    dismissSuggestion,
    clearChat,
    clearPendingTransaction,
    clearPendingBlik,
    clearPendingSwap,
  } = useAiChat();

  const flatListRef = useRef<FlatList>(null);
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccountIndex = wallet.currentAccountIndex;
  const currentAccount = wallet.accounts[currentAccountIndex];

  // Get native token balance for the top bar
  const nativeToken = balance.balances.find(
    (b) => b.symbol === 'ETH' || b.symbol === 'MATIC'
  );
  const displayBalance = nativeToken
    ? parseFloat(nativeToken.balance).toFixed(4)
    : '0.0000';
  const displaySymbol = nativeToken?.symbol ?? 'ETH';
  const isTestAccount = currentAccount?.type === 'test';
  const networkColor = isTestAccount ? aiChat.accentAmber : aiChat.accentGreen;

  // Load contacts on mount
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  // Check if address is already in contacts
  const isInContacts = useCallback((address: string) => {
    return contacts.some(c => c.address.toLowerCase() === address.toLowerCase());
  }, [contacts]);

  // Handle transaction confirmation
  const handleConfirmTransaction = useCallback(async (tx: PendingTransaction): Promise<string> => {
    if (!wallet.mnemonic || !currentAccount) {
      throw new Error('Wallet not available');
    }

    // Check if test account and non-native token
    const isTestAccount = currentAccount.type === 'test';
    const isNativeToken = tx.token.toUpperCase() === 'ETH' || tx.token.toUpperCase() === 'MATIC';

    if (isTestAccount && !isNativeToken) {
      throw new Error(`On test accounts, only native tokens (ETH) are supported. ${tx.token} transfers are not available on testnets.`);
    }

    const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

    // Send the transaction
    const txHash = await sendTransaction({
      wallet: hdWallet,
      to: tx.to,
      amount: tx.amount,
      token: isNativeToken ? 'ETH' : tx.token,
    });

    return txHash;
  }, [wallet.mnemonic, currentAccount]);

  // Handle saving contact
  const handleSaveContact = useCallback(async (address: string, name: string) => {
    await dispatch(saveContactThunk({ address, name }));
  }, [dispatch]);

  // Handle transaction complete (success card dismissed)
  const handleTransactionComplete = useCallback(() => {
    clearPendingTransaction();
  }, [clearPendingTransaction]);

  const handleCancelTransaction = useCallback(() => {
    clearPendingTransaction();
  }, [clearPendingTransaction]);

  // Handle BLIK pay confirmation
  const handleConfirmBlikPay = useCallback(async (blik: PendingBlikPay): Promise<string> => {
    if (!wallet.mnemonic || !currentAccount) {
      throw new Error('Wallet not available');
    }

    // Check if test account and non-native token
    const isTestAccount = currentAccount.type === 'test';
    const isNativeToken = blik.token.toUpperCase() === 'ETH' || blik.token.toUpperCase() === 'MATIC';

    if (isTestAccount && !isNativeToken) {
      throw new Error(`On test accounts, only native tokens (ETH) are supported. ${blik.token} transfers are not available on testnets.`);
    }

    const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

    // Send the BLIK payment
    const txHash = await sendTransaction({
      wallet: hdWallet,
      to: blik.receiverAddress,
      amount: blik.amount,
      token: isNativeToken ? 'ETH' : blik.token,
    });

    return txHash;
  }, [wallet.mnemonic, currentAccount]);

  // Handle BLIK complete
  const handleBlikComplete = useCallback(() => {
    clearPendingBlik();
  }, [clearPendingBlik]);

  const handleCancelBlik = useCallback(() => {
    clearPendingBlik();
  }, [clearPendingBlik]);

  // Handle Swap confirmation
  const handleConfirmSwap = useCallback(async (swap: PendingSwap): Promise<string> => {
    if (!wallet.mnemonic || !currentAccount) {
      throw new Error('Wallet not available');
    }

    const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

    // Execute swap as a native token send (placeholder — in production this would call a DEX router)
    const txHash = await sendTransaction({
      wallet: hdWallet,
      to: currentAccount.address, // Self-send placeholder for swap execution
      amount: swap.fromToken.amount,
      token: 'ETH',
    });

    return txHash;
  }, [wallet.mnemonic, currentAccount]);

  // Handle Swap approval
  const handleApproveSwap = useCallback(async (): Promise<void> => {
    // Token approval is a no-op for native ETH swaps
    // In production, this would call ERC-20 approve() on the token contract
  }, []);

  // Handle Swap complete
  const handleSwapComplete = useCallback(() => {
    clearPendingSwap();
  }, [clearPendingSwap]);

  const handleCancelSwap = useCallback(() => {
    clearPendingSwap();
  }, [clearPendingSwap]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const handleSuggestionPress = useCallback((suggestion: AiSuggestion) => {
    // If suggestion has an action with route, navigate
    if (suggestion.action?.route) {
      router.push(suggestion.action.route as any);
      return;
    }
    // Otherwise, send suggestion message to chat
    sendMessage(suggestion.message);
  }, [sendMessage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const isDisabled = !isConnected || isStreaming;
  const hasMessages = messages.length > 0;

  const QUICK_CHIPS = hasMessages
    ? ['Баланс', 'Отправить', 'BLIK', 'История']
    : ['Что ты умеешь?', 'Покажи баланс', 'Как отправить крипто?'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <ChatBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Minimal Top Bar: balance + network */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.balanceText}>
              {displayBalance}{' '}
              <Text style={styles.balanceSymbol}>{displaySymbol}</Text>
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <View style={[styles.networkDot, { backgroundColor: networkColor }]} />
            <Text style={styles.networkText}>
              {isTestAccount ? 'Sepolia Testnet' : 'Ethereum'}
            </Text>
          </View>
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
            >
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onPress={handleSuggestionPress}
                  onDismiss={dismissSuggestion}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.heroLine1}>Your wallet.</Text>
              <Text style={styles.heroLine2}>Your rules.</Text>
              <Text style={styles.heroSubtitle}>Just ask.</Text>
            </View>
          }
          ListFooterComponent={
            <>
              {isStreaming && <TypingIndicator streamingContent={streamingContent} />}
              {pendingTransaction && (
                <TransactionCard
                  transaction={pendingTransaction as PendingTransaction}
                  onConfirm={handleConfirmTransaction}
                  onCancel={handleCancelTransaction}
                  onComplete={handleTransactionComplete}
                  onSaveContact={handleSaveContact}
                  isInContacts={isInContacts(pendingTransaction.to)}
                  isTestAccount={currentAccount?.type === 'test'}
                />
              )}
              {pendingBlik && (
                <BlikCard
                  blik={pendingBlik as PendingBlik}
                  onConfirmPay={handleConfirmBlikPay}
                  onCancel={handleCancelBlik}
                  onComplete={handleBlikComplete}
                  onSaveContact={handleSaveContact}
                  isInContacts={pendingBlik.type === 'pay' ? isInContacts(pendingBlik.receiverAddress) : false}
                  isTestAccount={currentAccount?.type === 'test'}
                />
              )}
              {pendingSwap && (
                <SwapCard
                  swap={pendingSwap as PendingSwap}
                  onApprove={pendingSwap.requiresApproval ? handleApproveSwap : undefined}
                  onConfirm={handleConfirmSwap}
                  onCancel={handleCancelSwap}
                  onComplete={handleSwapComplete}
                  isTestAccount={currentAccount?.type === 'test'}
                />
              )}
            </>
          }
        />

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={16} color={aiChat.accentRed} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Quick Prompt Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickChipsContent}
          style={styles.quickChipsRow}
        >
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.quickChip}
              onPress={() => sendMessage(chip)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          disabled={isDisabled}
          placeholder={
            !isConnected
              ? 'Connecting...'
              : isStreaming
              ? 'AI is responding...'
              : 'Ask anything...'
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: aiChat.screen,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: aiChat.divider,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: aiChat.text.primary,
  },
  balanceSymbol: {
    fontSize: 14,
    fontWeight: '500',
    color: aiChat.text.tertiary,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 12,
    color: aiChat.text.tertiary,
  },
  suggestionsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  suggestionsContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  heroLine1: {
    fontSize: 38,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: -1,
    lineHeight: 46,
    textAlign: 'center',
  },
  heroLine2: {
    fontSize: 38,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.16)',
    letterSpacing: -1,
    lineHeight: 46,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(51,136,255,0.40)',
    marginTop: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  quickChipsRow: {
    flexShrink: 0,
    marginBottom: 0,
  },
  quickChipsContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
    alignItems: 'center',
  },
  quickChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: aiChat.text.secondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    ...theme.typography.caption,
    color: aiChat.accentRed,
    flex: 1,
  },
});
