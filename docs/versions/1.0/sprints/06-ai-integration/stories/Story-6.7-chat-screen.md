# Story S-26: Chat Screen UI

**Story ID:** S-26
**Epic:** [Epic 06: AI Integration](../prd/epic-06-ai-integration.md)
**Priority:** P1
**Estimate:** 10 hours
**Status:** Planned
**Created:** January 4, 2026

---

## User Story

**As a** user
**I want** a conversational interface to interact with my wallet
**So that** managing crypto feels like chatting with a smart assistant

---

## Acceptance Criteria

- [ ] Chat-style UI with message bubbles
- [ ] User messages on right, AI responses on left
- [ ] Text input with send button
- [ ] Voice input option (speech-to-text)
- [ ] AI typing indicator while processing
- [ ] Item Card appears inline in chat for transactions
- [ ] Message history persists across sessions
- [ ] Quick action buttons for common commands

---

## Design Specifications

### Chat Screen Layout

```
┌─────────────────────────────────────┐
│ 🤖 E-Y Assistant           [Ghost]  │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────┐       │
│   │ What's my balance?      │ ←You  │
│   └─────────────────────────┘       │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ You have $12,450 across    │      │
│ │ 3 networks:                │      │
│ │ • ETH: 3.5 ($11,200)       │      │
│ │ • USDC: 1,200              │      │
│ │ • ARB: 50 ($50)            │      │
│ └─────────────────────────────┘ AI← │
│                                     │
│   ┌─────────────────────────┐       │
│   │ Send 0.5 ETH to @alice  │ ←You  │
│   └─────────────────────────┘       │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ ┌───────────────────────┐  │      │
│ │ │ 🟢 SAFE TRANSACTION   │  │      │
│ │ │ To: @alice            │  │      │
│ │ │ Amount: 0.5 ETH       │  │      │
│ │ │ Fee: ~$0.50           │  │      │
│ │ │ [Swipe to confirm →]  │  │      │
│ │ └───────────────────────┘  │      │
│ │ Swipe right to send        │      │
│ └─────────────────────────────┘ AI← │
│                                     │
├─────────────────────────────────────┤
│ [Balance] [Send] [Swap] [History]   │  ← Quick actions
├─────────────────────────────────────┤
│ [🎤] [ Type a message...   ] [Send] │
└─────────────────────────────────────┘
```

### Message Types

| Type | Description | UI Component |
|------|-------------|--------------|
| `text` | Plain text | Message bubble |
| `balance` | Balance response | Formatted list |
| `transaction` | TX confirmation | Item Card (S-21) |
| `error` | Error message | Red bubble |
| `typing` | AI thinking | Animated dots |

### Quick Actions

| Button | Command Sent |
|--------|--------------|
| Balance | "What's my balance?" |
| Send | Opens send flow |
| Swap | Opens swap flow |
| History | "Show my recent transactions" |

---

## Technical Implementation

### Chat Message Types

```typescript
// mobile/src/types/chat.ts

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageContentType = 'text' | 'balance' | 'transaction' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  contentType: MessageContentType;
  content: string | BalanceContent | TransactionContent;
  timestamp: Date;
}

export interface BalanceContent {
  total: string;
  totalUsd: string;
  tokens: Array<{
    symbol: string;
    balance: string;
    usdValue: string;
    network: string;
  }>;
}

export interface TransactionContent {
  intent: ParsedIntent;
  riskLevel: 'safe' | 'caution' | 'warning';
  riskReasons?: string[];
}
```

### Chat Screen Component

```typescript
// mobile/src/screens/ChatScreen.tsx

import { useState, useEffect, useRef } from 'react';
import { FlatList, TextInput, KeyboardAvoidingView } from 'react-native';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ChatBubble } from '../components/Chat/ChatBubble';
import { ItemCard } from '../components/ItemCard/ItemCard';
import { QuickActions } from '../components/Chat/QuickActions';
import { aiService } from '../services/aiService';

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { startListening, isListening, transcript } = useSpeechRecognition();

  // Load message history
  useEffect(() => {
    loadMessageHistory();
  }, []);

  // Handle voice input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      contentType: 'text',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await aiService.processCommand(inputText);
      const aiMessage = formatAIResponse(response);
      setMessages(prev => [...prev, aiMessage]);
      saveMessageHistory([...messages, userMessage, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        contentType: 'error',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.contentType === 'transaction') {
      return (
        <ItemCard
          transaction={(item.content as TransactionContent).intent}
          riskLevel={(item.content as TransactionContent).riskLevel}
          onSwipeRight={() => handleConfirmTransaction(item)}
          onSwipeLeft={() => handleCancelTransaction(item)}
        />
      );
    }

    return <ChatBubble message={item} />;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isLoading && <TypingIndicator />}

      <QuickActions onAction={handleQuickAction} />

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={startListening} style={styles.voiceButton}>
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={24}
            color={isListening ? '#22C55E' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
```

### Chat Bubble Component

```typescript
// mobile/src/components/Chat/ChatBubble.tsx

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.contentType === 'error';

  return (
    <View style={[
      styles.bubble,
      isUser ? styles.userBubble : styles.aiBubble,
      isError && styles.errorBubble,
    ]}>
      {message.contentType === 'balance' ? (
        <BalanceDisplay balance={message.content as BalanceContent} />
      ) : (
        <Text style={styles.text}>{message.content as string}</Text>
      )}
      <Text style={styles.timestamp}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};
```

### Typing Indicator

```typescript
// mobile/src/components/Chat/TypingIndicator.tsx

export const TypingIndicator: React.FC = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300 })
    ), -1);
    // Stagger other dots
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
};
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/screens/ChatScreen.tsx` | CREATE | Main chat screen |
| `mobile/src/components/Chat/ChatBubble.tsx` | CREATE | Message bubble |
| `mobile/src/components/Chat/TypingIndicator.tsx` | CREATE | AI typing animation |
| `mobile/src/components/Chat/QuickActions.tsx` | CREATE | Quick action buttons |
| `mobile/src/components/Chat/BalanceDisplay.tsx` | CREATE | Balance card in chat |
| `mobile/src/types/chat.ts` | CREATE | TypeScript types |
| `mobile/src/services/chatHistoryService.ts` | CREATE | Message persistence |
| `mobile/src/hooks/useSpeechRecognition.ts` | CREATE | Voice input hook |
| `mobile/src/navigation/MainNavigator.tsx` | MODIFY | Add Chat tab |

---

## Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | Type "What's my balance?" | Balance displayed in chat |
| 2 | Type "Send 0.1 ETH to @bob" | Item Card appears inline |
| 3 | Swipe card right | Transaction confirmed |
| 4 | Tap voice button | Speech recognition starts |
| 5 | Tap "Balance" quick action | Balance command sent |
| 6 | Close and reopen app | Message history preserved |
| 7 | AI processing | Typing indicator shown |

---

## Definition of Done

- [ ] Chat UI with message bubbles
- [ ] Item Card integration for transactions
- [ ] Voice input works
- [ ] Quick actions work
- [ ] Message history persists
- [ ] Typing indicator during AI processing
- [ ] Works on iOS and Android
- [ ] Unit tests pass
