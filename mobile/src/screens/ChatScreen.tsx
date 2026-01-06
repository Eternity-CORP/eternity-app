import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useGhostMode } from '../context/GhostModeContext';
import { useWallet } from '../context/WalletContext';
import { ChatMessage, QuickAction } from '../types/chat';
import { ChatBubble, TypingIndicator, QuickActions } from '../components/Chat';
import {
  loadChatHistory,
  saveChatHistory,
  createUserMessage,
  createAIMessage,
  createErrorMessage,
  generateMessageId,
} from '../services/chatHistoryService';
import { getETHBalance, formatBalance } from '../services/blockchain/balanceService';
import { getTokenBalance } from '../services/blockchain/tokenService';
import { SUPPORTED_TOKENS } from '../constants/tokens';
import { getTokenPreferences } from '../services/state/tokenPreferences';
import { getEthUsdPrice, getTokenUsdPrice } from '../services/priceService';
import { ethers } from 'ethers';
import { getSelectedNetwork } from '../services/networkService';
import { MainStackParamList } from '../navigation/MainNavigator';
import type { Network } from '../config/env';
import {
  detectCommandType,
  parseSendCommand,
  parseSwapCommand,
  parseHistoryCommand,
  formatSendConfirmation,
  formatSwapConfirmation,
} from '../utils/chatCommandParser';
import { sendChatMessage, ChatResponse, ChatAction, ParsedIntent } from '../services/aiChatService';
import { useScheduledPayments } from '../features/schedule/store/scheduledSlice';
import { getJobRunner } from '../features/schedule/JobRunner';
import { resolveIdentifier } from '../services/api/identityService';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  contentType: 'text',
  content: "👋 Hi! I'm your E-Y assistant. Ask me about your balance, send crypto, or just chat!",
  timestamp: new Date(),
};

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function ChatScreen() {
  const { theme } = useTheme();
  const { isGhostMode, toggleGhostMode } = useGhostMode();
  const { activeAccount } = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const addPayment = useScheduledPayments((state) => state.addPayment);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<Network>('sepolia');

  // Load current network
  useEffect(() => {
    getSelectedNetwork().then(setCurrentNetwork);
  }, []);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await loadChatHistory();
    if (history.length > 0) {
      setMessages([WELCOME_MESSAGE, ...history]);
    }
  };

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Get wallet context (balance + tokens) for AI
  const getWalletContext = async () => {
    const result: { balance?: string; tokens: Array<{ symbol: string; balance: string; usdValue?: string; network?: string }> } = {
      tokens: [],
    };

    if (!activeAccount?.address) return result;

    try {
      // Get ETH balance
      const ethBalance = await getETHBalance(activeAccount.address, currentNetwork);
      result.balance = formatBalance(ethBalance);

      // Get ETH USD price
      const ethPrice = await getEthUsdPrice();
      const ethUsd = (parseFloat(result.balance) * ethPrice).toFixed(2);
      
      result.tokens.push({
        symbol: 'ETH',
        balance: result.balance,
        usdValue: `$${ethUsd}`,
        network: currentNetwork,
      });

      // Get token preferences and balances
      const prefs = await getTokenPreferences();
      const visibleSymbols = new Set(prefs.visibleSymbols);
      const tokensToCheck = SUPPORTED_TOKENS.filter(t => visibleSymbols.has(t.symbol));

      for (const token of tokensToCheck) {
        if (token.symbol === 'ETH') continue; // Already added
        
        const addr = token.networks?.[currentNetwork];
        if (!addr) continue;

        try {
          const balBN = await getTokenBalance(addr, activeAccount.address, currentNetwork);
          const amount = Number(ethers.utils.formatUnits(balBN, token.decimals));
          
          if (amount > 0) {
            const usdPrice = await getTokenUsdPrice(token.symbol);
            const usdValue = usdPrice ? `$${(amount * usdPrice).toFixed(2)}` : undefined;
            
            result.tokens.push({
              symbol: token.symbol,
              balance: amount.toFixed(6),
              usdValue,
              network: currentNetwork,
            });
          }
        } catch {
          // Token balance fetch failed, skip
        }
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to get wallet context:', error);
    }

    return result;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = createUserMessage(inputText.trim());
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToEnd();

    try {
      const response = await processUserInput(userMessage.content as string);
      setMessages(prev => [...prev, response]);
      
      // Save to history (exclude welcome message)
      const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage, response];
      await saveChatHistory(newMessages);
    } catch (error) {
      const errorMessage = createErrorMessage('Sorry, something went wrong. Please try again.');
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToEnd();
    }
  };

  const processUserInput = async (input: string): Promise<ChatMessage> => {
    try {
      // Get wallet context for AI
      const walletContext = await getWalletContext();

      // Call backend AI
      const response = await sendChatMessage({
        message: input,
        walletAddress: activeAccount?.address,
        balance: walletContext.balance,
        tokens: walletContext.tokens,
        network: currentNetwork,
      });

      // Handle intents that need recipient resolution
      if (response.intent) {
        const errorMessage = await handleIntentWithValidation(response.intent);
        if (errorMessage) {
          return createAIMessage(errorMessage);
        }
      }

      // Handle action from AI
      handleAIAction(response.action);

      // Return AI response as chat message
      return createAIMessage(response.response);
    } catch (error) {
      console.error('[ChatScreen] AI request failed, falling back to local:', error);
      // Fallback to local processing if backend fails
      return processUserInputLocal(input);
    }
  };

  // Validate and handle intents that need recipient resolution
  const handleIntentWithValidation = async (intent: ParsedIntent): Promise<string | null> => {
    const intentType = intent.type;
    
    // Only validate intents that require recipient/participants
    const needsRecipientValidation = ['send', 'schedule', 'split_bill'].includes(intentType);
    
    if (!needsRecipientValidation) {
      return null; // No validation needed for balance, swap, etc.
    }

    // Validate recipient for send/schedule
    if ((intentType === 'send' || intentType === 'schedule') && intent.recipient) {
      const recipientError = await validateRecipient(intent.recipient);
      if (recipientError) return recipientError;
    }

    // Validate participants for split_bill
    if (intentType === 'split_bill' && intent.participants) {
      for (const participant of intent.participants) {
        const participantError = await validateRecipient(participant);
        if (participantError) return participantError;
      }
    }

    // Handle schedule intent creation
    if (intentType === 'schedule') {
      return handleScheduleIntent(intent);
    }

    return null;
  };

  // Validate a recipient (nickname or address)
  const validateRecipient = async (recipient: string): Promise<string | null> => {
    // Skip validation for direct addresses
    if (ethers.utils.isAddress(recipient)) {
      return null;
    }

    // Validate nicknames
    if (recipient.startsWith('@') || recipient.startsWith('ey-')) {
      try {
        const resolved = await resolveIdentifier(recipient);
        if (!resolved?.wallets?.length) {
          return `❌ Пользователь ${recipient} не найден. Проверьте никнейм и попробуйте снова.`;
        }
      } catch (error: any) {
        if (error.message === 'RECIPIENT_NOT_FOUND') {
          return `❌ Пользователь ${recipient} не найден в системе.`;
        }
        return `❌ Не удалось найти ${recipient}. Попробуйте позже.`;
      }
    } else {
      return `❌ Неверный формат: "${recipient}". Используйте адрес (0x...) или никнейм (@username).`;
    }

    return null;
  };

  // Handle schedule intent from AI - create scheduled payment directly
  const handleScheduleIntent = async (intent: ParsedIntent): Promise<string | null> => {
    if (!intent.recipient || !intent.amount) {
      // Navigate to SchedulePayment screen if params are missing
      navigation.navigate('SchedulePayment');
      return null;
    }

    try {
      // Resolve recipient if it's a nickname
      let finalAddress = intent.recipient;
      let recipientName = intent.recipient;
      
      if (intent.recipient.startsWith('@') || intent.recipient.startsWith('ey-')) {
        try {
          const resolved = await resolveIdentifier(intent.recipient);
          if (resolved?.wallets?.length > 0) {
            const primaryWallet = resolved.wallets.find(w => w.isPrimary) || resolved.wallets[0];
            finalAddress = primaryWallet.address;
            recipientName = resolved.nickname || intent.recipient;
          } else {
            return `❌ Пользователь ${intent.recipient} не найден. Проверьте никнейм и попробуйте снова.`;
          }
        } catch (error: any) {
          if (error.message === 'RECIPIENT_NOT_FOUND') {
            return `❌ Пользователь ${intent.recipient} не найден в системе. Убедитесь, что никнейм правильный.`;
          }
          return `❌ Не удалось найти ${intent.recipient}. Попробуйте позже или используйте адрес кошелька.`;
        }
      }

      // Convert to checksum address (EIP-55 required by validator)
      try {
        finalAddress = ethers.utils.getAddress(finalAddress);
      } catch {
        return `❌ Неверный формат адреса: ${intent.recipient}. Введите корректный адрес кошелька.`;
      }

      // Parse schedule time
      let scheduleAt = Date.now() + 60 * 60 * 1000; // Default: 1 hour
      if (intent.scheduleTime) {
        const parsed = parseScheduleTime(intent.scheduleTime);
        if (parsed) scheduleAt = parsed;
      }

      // Create scheduled payment
      try {
        addPayment({
          kind: 'one_time',
          chainId: 11155111, // Sepolia
          asset: { type: 'ETH' },
          fromAccountId: 'default',
          to: finalAddress,
          amountHuman: intent.amount,
          scheduleAt,
          note: intent.description || undefined,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        // Start JobRunner
        const jobRunner = getJobRunner();
        jobRunner.start();

        console.log('[ChatScreen] Scheduled payment created:', {
          to: finalAddress,
          amount: intent.amount,
          scheduleAt: new Date(scheduleAt).toISOString(),
        });

        return null; // Success - no error message
      } catch (validationError: any) {
        console.error('[ChatScreen] Validation error:', validationError);
        if (validationError.errors?.length > 0) {
          return `❌ Ошибка: ${validationError.errors.join(', ')}`;
        }
        return `❌ Не удалось создать платёж. Проверьте данные и попробуйте снова.`;
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to create scheduled payment:', error);
      return `❌ Произошла ошибка. Попробуйте создать платёж вручную.`;
    }
  };

  // Parse schedule time string to timestamp
  const parseScheduleTime = (timeStr: string): number | null => {
    const now = Date.now();
    
    // Check for relative time like "4 hours", "30 minutes"
    const hourMatch = timeStr.match(/(\d+)\s*(hour|час|ч)/i);
    if (hourMatch) {
      return now + parseInt(hourMatch[1]) * 60 * 60 * 1000;
    }
    
    const minMatch = timeStr.match(/(\d+)\s*(min|мин)/i);
    if (minMatch) {
      return now + parseInt(minMatch[1]) * 60 * 1000;
    }
    
    const dayMatch = timeStr.match(/(\d+)\s*(day|день|дн)/i);
    if (dayMatch) {
      return now + parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
    }

    // Try to parse as ISO date
    const date = new Date(timeStr);
    if (!isNaN(date.getTime()) && date.getTime() > now) {
      return date.getTime();
    }

    return null;
  };

  const handleAIAction = (action?: ChatAction) => {
    if (!action || action.type === 'none') return;

    switch (action.type) {
      case 'navigate':
        handleNavigateAction(action);
        break;
      case 'show_balance':
        // Balance is already shown in the response
        break;
      case 'confirm':
        // Confirmation is handled via ItemCard swipe
        break;
    }
  };

  const handleNavigateAction = (action: ChatAction) => {
    const screen = action.screen;
    const params = action.params as any;

    switch (screen) {
      case 'Send':
        navigation.navigate('Send', params);
        break;
      case 'Swap':
        navigation.navigate('Swap', params);
        break;
      case 'Receive':
        navigation.navigate('Receive');
        break;
      case 'TransactionHistory':
        if (activeAccount?.address) {
          navigation.navigate('TransactionHistory', { address: activeAccount.address });
        }
        break;
      case 'SplitBill':
        navigation.navigate('SplitBill');
        break;
      case 'CreateBlikCode':
        navigation.navigate('CreateBlikCode');
        break;
      case 'PayBlikCode':
        navigation.navigate('PayBlikCode');
        break;
      case 'SchedulePayment':
        navigation.navigate('SchedulePayment');
        break;
      case 'Settings':
        navigation.navigate('Settings');
        break;
      default:
        console.log('[ChatScreen] Unknown screen:', screen);
    }
  };

  // Local fallback when backend is unavailable
  const processUserInputLocal = async (input: string): Promise<ChatMessage> => {
    const commandType = detectCommandType(input);

    switch (commandType) {
      case 'balance':
        return await fetchRealBalance();

      case 'send': {
        const params = parseSendCommand(input);
        navigation.navigate('Send', {
          recipient: params.recipient,
          amount: params.amount,
          token: params.token,
        });
        return createAIMessage(formatSendConfirmation(params));
      }

      case 'swap': {
        const params = parseSwapCommand(input);
        navigation.navigate('Swap', {
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
        });
        return createAIMessage(formatSwapConfirmation(params));
      }

      case 'history': {
        if (!activeAccount?.address) {
          return createAIMessage("Please set up a wallet first to view history.");
        }
        navigation.navigate('TransactionHistory', { address: activeAccount.address });
        return createAIMessage("📜 Opening transaction history...");
      }

      case 'receive':
        navigation.navigate('Receive');
        return createAIMessage("📥 Opening receive screen...");

      default:
        return createAIMessage(
          "I can help you with:\n\n" +
          "💰 **Balance** - Check your wallet\n" +
          "📤 **Send** - Send crypto\n" +
          "📥 **Receive** - Get your address\n" +
          "🔄 **Swap** - Exchange tokens\n" +
          "📜 **History** - View transactions"
        );
    }
  };

  const fetchRealBalance = async (): Promise<ChatMessage> => {
    try {
      if (!activeAccount?.address) {
        return createAIMessage("Please set up a wallet first to check balance.");
      }

      const balance = await getETHBalance(activeAccount.address, currentNetwork);
      const formattedBalance = formatBalance(balance);
      const ethPrice = await getEthUsdPrice();
      const usdValue = (parseFloat(formattedBalance) * ethPrice).toFixed(2);

      const networkName = currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1);

      return {
        id: generateMessageId(),
        role: 'assistant',
        contentType: 'balance',
        content: {
          total: formattedBalance,
          totalUsd: `$${usdValue}`,
          tokens: [
            { 
              symbol: 'ETH', 
              balance: formattedBalance, 
              usdValue: `$${usdValue}`, 
              network: networkName 
            },
          ],
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return createErrorMessage('Failed to fetch balance. Please try again.');
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (action.command === 'send') {
      navigation.navigate('Send');
      const message = createAIMessage('📤 Opening send screen...');
      setMessages(prev => [...prev, message]);
      scrollToEnd();
      return;
    }
    if (action.command === 'swap') {
      navigation.navigate('Swap');
      const message = createAIMessage('🔄 Opening swap screen...');
      setMessages(prev => [...prev, message]);
      scrollToEnd();
      return;
    }

    // For other actions, process as text
    const userMessage = createUserMessage(action.command);
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    scrollToEnd();

    try {
      const response = await processUserInput(action.command);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      const errorMessage = createErrorMessage('Sorry, something went wrong.');
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToEnd();
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    return <ChatBubble message={item} />;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header with safe area */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🤖 E-Y Assistant</Text>
        </View>
        <TouchableOpacity onPress={toggleGhostMode} style={styles.ghostButton}>
          <Ionicons
            name={isGhostMode ? 'eye-off' : 'eye'}
            size={22}
            color={isGhostMode ? theme.colors.primary : theme.colors.textSecondary}
          />
          {isGhostMode && (
            <Text style={[styles.ghostLabel, { color: theme.colors.primary }]}>Ghost</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      />

      {/* Typing Indicator */}
      {isLoading && <TypingIndicator />}

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom || 16 }]}>
        <TextInput
          style={[styles.textInput, { color: theme.colors.text, backgroundColor: theme.colors.background }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textSecondary}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  ghostLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageList: {
    paddingVertical: 16,
  },
  transactionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6, // Bittensor style
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 6, // Bittensor style
    alignItems: 'center',
    justifyContent: 'center',
  },
});
