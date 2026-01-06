import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types/chat';

const CHAT_HISTORY_KEY = '@chat_history';
const MAX_MESSAGES = 100;

/**
 * Save chat messages to persistent storage
 */
export const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
  try {
    // Keep only last MAX_MESSAGES
    const trimmedMessages = messages.slice(-MAX_MESSAGES);
    await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmedMessages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

/**
 * Load chat messages from persistent storage
 */
export const loadChatHistory = async (): Promise<ChatMessage[]> => {
  try {
    const stored = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const messages = JSON.parse(stored) as ChatMessage[];
      // Convert timestamp strings back to Date objects
      return messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
};

/**
 * Clear all chat history
 */
export const clearChatHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
};

/**
 * Generate unique message ID
 */
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a user message
 */
export const createUserMessage = (content: string): ChatMessage => ({
  id: generateMessageId(),
  role: 'user',
  contentType: 'text',
  content,
  timestamp: new Date(),
});

/**
 * Create an AI text message
 */
export const createAIMessage = (content: string): ChatMessage => ({
  id: generateMessageId(),
  role: 'assistant',
  contentType: 'text',
  content,
  timestamp: new Date(),
});

/**
 * Create an error message
 */
export const createErrorMessage = (content: string): ChatMessage => ({
  id: generateMessageId(),
  role: 'assistant',
  contentType: 'error',
  content,
  timestamp: new Date(),
});
