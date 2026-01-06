import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage, BalanceContent } from '../../types/chat';
import { useTheme } from '../../context/ThemeContext';
import { useGhostMode } from '../../context/GhostModeContext';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { theme } = useTheme();
  const { isGhostMode } = useGhostMode();
  const isUser = message.role === 'user';
  const isError = message.contentType === 'error';

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (message.contentType === 'balance' && typeof message.content !== 'string') {
      const balance = message.content as BalanceContent;
      return (
        <View>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
            Total Balance
          </Text>
          <Text style={[styles.totalValue, { color: theme.colors.text }]}>
            {isGhostMode ? '••••••' : balance.totalUsd}
          </Text>
          <View style={styles.tokenList}>
            {balance.tokens.map((token, index) => (
              <View key={index} style={styles.tokenRow}>
                <Text style={[styles.tokenSymbol, { color: theme.colors.text }]}>
                  {token.symbol}
                </Text>
                <Text style={[styles.tokenBalance, { color: theme.colors.textSecondary }]}>
                  {isGhostMode ? '•••' : token.balance}
                </Text>
                <Text style={[styles.tokenUsd, { color: theme.colors.textSecondary }]}>
                  {isGhostMode ? '••••' : token.usdValue}
                </Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <Text style={[styles.text, { color: isUser ? '#FFFFFF' : theme.colors.text }]}>
        {message.content as string}
      </Text>
    );
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          isError && styles.errorBubble,
          { backgroundColor: isUser ? theme.colors.primary : theme.colors.surface },
        ]}
      >
        {renderContent()}
        <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6, // Bittensor style
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    borderBottomLeftRadius: 2,
  },
  errorBubble: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  tokenList: {
    gap: 6,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenSymbol: {
    fontSize: 12,
    fontWeight: '500',
    width: 50,
  },
  tokenBalance: {
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  tokenUsd: {
    fontSize: 12,
    width: 70,
    textAlign: 'right',
  },
});

export default ChatBubble;
