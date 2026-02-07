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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  type PendingTransaction,
  type PendingBlik,
  type PendingBlikPay,
  type PendingSwap,
} from '@/src/components/ai';
import { useTheme } from '@/src/contexts';
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

  const { theme: dynamicTheme, isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccountIndex = wallet.currentAccountIndex;
  const currentAccount = wallet.accounts[currentAccountIndex];

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerGlassContainer, { borderColor: dynamicTheme.colors.glassBorder }]}>
            <BlurView intensity={80} tint={isDark ? 'light' : 'dark'} style={styles.headerBlur}>
              <View style={styles.headerContent}>
                <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}>
                  <FontAwesome name="magic" size={20} color={dynamicTheme.colors.textPrimary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.headerTitle, { color: dynamicTheme.colors.textPrimary }]}>Eternity AI</Text>
                  <Text style={[styles.headerSubtitle, { color: dynamicTheme.colors.textSecondary }]}>
                    {isConnected ? 'Ready to help' : 'Connecting...'}
                  </Text>
                </View>
                <View style={styles.statusIndicator}>
                  <View style={[
                    styles.statusDot,
                    isConnected ? styles.statusDotConnected : styles.statusDotDisconnected
                  ]} />
                </View>
              </View>
            </BlurView>
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
              <View style={styles.emptyIcon}>
                <FontAwesome name="comments-o" size={48} color={dynamicTheme.colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: dynamicTheme.colors.textPrimary }]}>Chat with AI</Text>
              <Text style={[styles.emptySubtitle, { color: dynamicTheme.colors.textSecondary }]}>
                Ask about your balance, send crypto, or get help with transactions
              </Text>
              <View style={styles.examplesContainer}>
                <Text style={[styles.examplesTitle, { color: dynamicTheme.colors.textTertiary }]}>Try asking:</Text>
                <Text style={[styles.exampleText, { color: dynamicTheme.colors.accent }]}>"What's my balance?"</Text>
                <Text style={[styles.exampleText, { color: dynamicTheme.colors.accent }]}>"Send 0.1 ETH to @username"</Text>
                <Text style={[styles.exampleText, { color: dynamicTheme.colors.accent }]}>"Show my recent transactions"</Text>
              </View>
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
          <View style={[styles.errorBanner, { backgroundColor: dynamicTheme.colors.error + '15', borderColor: dynamicTheme.colors.error + '30' }]}>
            <FontAwesome name="exclamation-circle" size={16} color={dynamicTheme.colors.error} />
            <Text style={[styles.errorText, { color: dynamicTheme.colors.error }]}>{error}</Text>
          </View>
        )}

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
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  headerGlassContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  headerBlur: {
    padding: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.heading,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statusIndicator: {
    padding: theme.spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotConnected: {
    backgroundColor: theme.colors.success,
  },
  statusDotDisconnected: {
    backgroundColor: theme.colors.textTertiary,
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
    paddingTop: theme.spacing.xxl * 2,
  },
  emptyIcon: {
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  examplesContainer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  examplesTitle: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  exampleText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginBottom: theme.spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    flex: 1,
  },
});
