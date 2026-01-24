/**
 * AI Chat Screen
 * Main AI assistant interface with chat, suggestions, and streaming
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
import { router } from 'expo-router';
import { useAiChat } from '@/src/hooks/useAiChat';
import { ChatBubble, ChatInput, TypingIndicator, SuggestionCard } from '@/src/components/ai';
import { theme } from '@/src/constants/theme';
import type { ChatMessage, AiSuggestion } from '@/src/services/ai-service';

export default function AiScreen() {
  const {
    messages,
    suggestions,
    status,
    isConnected,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    dismissSuggestion,
    clearChat,
  } = useAiChat();

  const flatListRef = useRef<FlatList>(null);

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={theme.colors.gradientBlue as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <FontAwesome name="magic" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSubtitle}>
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
          </LinearGradient>
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
                <FontAwesome name="comments-o" size={48} color={theme.colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Chat with AI</Text>
              <Text style={styles.emptySubtitle}>
                Ask about your balance, send crypto, or get help with transactions
              </Text>
              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Try asking:</Text>
                <Text style={styles.exampleText}>"What's my balance?"</Text>
                <Text style={styles.exampleText}>"Send 0.1 ETH to @username"</Text>
                <Text style={styles.exampleText}>"Show my recent transactions"</Text>
              </View>
            </View>
          }
          ListFooterComponent={
            isStreaming ? (
              <TypingIndicator streamingContent={streamingContent} />
            ) : null
          }
        />

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
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
  headerGradient: {
    borderRadius: theme.borderRadius.lg,
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
