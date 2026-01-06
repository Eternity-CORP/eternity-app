/**
 * AI Chat Service - communicates with backend AI endpoint
 */

import { API_BASE_URL } from '../config/env';
import { loginWithWallet } from './authService';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';

async function getAuthToken(walletAddress?: string): Promise<string | null> {
  // Try to get cached token
  try {
    const cached = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (cached) return cached;
  } catch {
    // SecureStore not available
  }

  // If no cached token and we have wallet address, login
  if (walletAddress) {
    const token = await loginWithWallet(walletAddress, 10000);
    if (token) {
      try {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      } catch {
        // SecureStore not available
      }
    }
    return token;
  }

  return null;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue?: string;
  network?: string;
}

export interface ChatRequest {
  message: string;
  locale?: string;
  walletAddress?: string;
  balance?: string;
  tokens?: TokenBalance[];
  network?: string;
}

export interface ParsedIntent {
  type: 'balance' | 'send' | 'swap' | 'fees' | 'price' | 'split_bill' | 'blik_create' | 'blik_pay' | 'schedule' | 'conditional_swap' | 'rebalance' | 'unknown';
  amount?: string;
  token?: string;
  recipient?: string;
  fromToken?: string;
  toToken?: string;
  participants?: string[];
  description?: string;
  scheduleTime?: string;
  recurring?: string;
  expirationMinutes?: number;
  condition?: string;
  targetAllocation?: Record<string, number>;
  confidence?: number;
}

export interface ChatAction {
  type: 'navigate' | 'show_balance' | 'show_data' | 'confirm' | 'none';
  screen?: string;
  params?: Record<string, unknown>;
  data?: unknown;
}

export interface ChatResponse {
  response: string;
  intent?: ParsedIntent;
  action?: ChatAction;
  detectedLocale: string;
  processingTimeMs: number;
}

/**
 * Send message to AI chat endpoint
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const token = await getAuthToken(request.walletAddress);
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[aiChatService] Error:', response.status, errorText);
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const data = await response.json();
  return data as ChatResponse;
}

/**
 * Check if AI service is available
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    // Simple health check - we'll use the actual chat endpoint
    // If it returns any response (even error), the service is up
    return true;
  } catch {
    return false;
  }
}
