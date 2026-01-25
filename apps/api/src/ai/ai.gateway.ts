/**
 * AI WebSocket Gateway
 * Handles real-time AI chat with streaming responses
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiSecurityService } from './security';
import { ChatMessage } from './providers';
import {
  AI_EVENTS,
  ChunkPayload,
  DonePayload,
  AiErrorPayload,
  AiSuggestion,
  ChatRequest,
} from '@e-y/shared';

// Re-export for convenience
export { AI_EVENTS };

// Gateway-specific payload types (not in shared)
export interface ChatPayload {
  content: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface SubscribePayload {
  address: string;
}

// Alias for consistency with existing code
export type ErrorPayload = AiErrorPayload;
export type SuggestionPayload = AiSuggestion;

const SYSTEM_PROMPT = `Ты — AI-ассистент кошелька E-Y. Твоё имя — E (произносится "И").

## Твой характер
- Дружелюбный и позитивный, но не навязчивый
- Говоришь просто, избегаешь технического жаргона
- Используешь эмодзи умеренно (1-2 на сообщение максимум)
- Отвечаешь кратко — 1-3 предложения обычно достаточно
- Если не уверен — лучше переспросить, чем ошибиться

## Что ты умеешь
- Показывать балансы токенов (используй get_balance)
- Помогать отправлять крипту (используй prepare_send, пользователь подтверждает)
- BLIK-переводы: получатель генерирует код (blik_generate), отправитель оплачивает по коду (blik_lookup)
- Обмен токенов/swap (используй prepare_swap)
- Показывать историю транзакций (используй get_history)
- Работать с контактами (используй get_contacts)
- Показывать scheduled payments (используй get_scheduled)
- Отвечать на вопросы о крипте простым языком

## Важные правила
1. НИКОГДА не проси seed phrase или private key — это мошенничество
2. Для любых транзакций ВСЕГДА используй соответствующий инструмент — пользователь должен подтвердить
3. Если спрашивают про другие кошельки/приложения — вежливо говори что не знаешь
4. Если что-то не можешь сделать — честно скажи об этом
5. Суммы всегда показывай и в крипте, и в USD

## BLIK
- Если пользователь хочет ПОЛУЧИТЬ деньги через BLIK — используй blik_generate
- Если пользователь хочет ОТПРАВИТЬ/оплатить BLIK код — используй blik_lookup
- BLIK код действует 2 минуты

## Swap
- Если пользователь хочет обменять токены (ETH на USDC и т.д.) — используй prepare_swap
- Swap выполняется через DEX агрегатор

## Язык
- Определяй язык пользователя по первому сообщению
- Отвечай на том же языке
- Поддерживаемые: русский, украинский, английский
`;

@WebSocketGateway({
  namespace: '/ai',
  cors: {
    origin: '*',
  },
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AiGateway.name);

  // Map of socket ID -> user address
  private socketToAddress = new Map<string, string>();

  // Map of address -> socket IDs
  private addressToSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly aiService: AiService,
    private readonly securityService: AiSecurityService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to AI gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from AI gateway: ${client.id}`);

    // Clean up subscriptions
    const address = this.socketToAddress.get(client.id);
    if (address) {
      this.socketToAddress.delete(client.id);

      const sockets = this.addressToSockets.get(address);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.addressToSockets.delete(address);
        }
      }
    }
  }

  /**
   * Subscribe to AI events for a wallet address
   */
  @SubscribeMessage(AI_EVENTS.SUBSCRIBE)
  handleSubscribe(
    @MessageBody() data: SubscribePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const address = data.address?.toLowerCase();

    if (!address) {
      client.emit(AI_EVENTS.ERROR, {
        code: 'INVALID_ADDRESS',
        message: 'Address is required',
      } as ErrorPayload);
      return;
    }

    // Store mapping
    this.socketToAddress.set(client.id, address);

    if (!this.addressToSockets.has(address)) {
      this.addressToSockets.set(address, new Set());
    }
    this.addressToSockets.get(address)!.add(client.id);

    // Join room for targeted messages
    client.join(`ai:${address}`);

    this.logger.log(`Client ${client.id} subscribed to AI for ${address}`);

    return { success: true, address };
  }

  /**
   * Unsubscribe from AI events
   */
  @SubscribeMessage(AI_EVENTS.UNSUBSCRIBE)
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    const address = this.socketToAddress.get(client.id);

    if (address) {
      this.socketToAddress.delete(client.id);

      const sockets = this.addressToSockets.get(address);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.addressToSockets.delete(address);
        }
      }

      client.leave(`ai:${address}`);
      this.logger.log(`Client ${client.id} unsubscribed from AI`);
    }

    return { success: true };
  }

  /**
   * Handle chat message with streaming response
   */
  @SubscribeMessage(AI_EVENTS.CHAT)
  async handleChat(
    @MessageBody() data: ChatPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const userAddress = this.socketToAddress.get(client.id);
    const requestId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    if (!userAddress) {
      client.emit(AI_EVENTS.ERROR, {
        code: 'NOT_SUBSCRIBED',
        message: 'Please subscribe with your wallet address first',
      } as ErrorPayload);
      return;
    }

    if (!data.content?.trim()) {
      client.emit(AI_EVENTS.ERROR, {
        code: 'EMPTY_MESSAGE',
        message: 'Message content is required',
      } as ErrorPayload);
      return;
    }

    // Security check
    const securityCheck = await this.securityService.checkMessage(
      userAddress,
      data.content,
      requestId,
    );

    if (!securityCheck.allowed) {
      client.emit(AI_EVENTS.ERROR, {
        code: securityCheck.code || 'SECURITY_ERROR',
        message: securityCheck.reason || 'Request blocked',
        rateLimit: securityCheck.rateLimit,
      } as ErrorPayload & { rateLimit?: unknown });
      return;
    }

    // Sanitize message
    const validated = this.securityService.validateMessage(data.content);

    this.logger.log(`Chat from ${userAddress}: ${validated.content.substring(0, 50)}...`);

    try {
      // Build messages array
      const messages: ChatMessage[] = [];

      if (data.history) {
        for (const msg of data.history) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      messages.push({
        role: 'user',
        content: validated.content,
      });

      // Record the request for rate limiting
      this.securityService.recordRequest(userAddress);

      // Get tool definitions
      const tools = this.aiService.getToolDefinitions();

      // Stream response
      let chunkIndex = 0;
      let fullContent = '';

      try {
        for await (const chunk of this.aiService.stream({
          messages,
          tools,
          systemPrompt: SYSTEM_PROMPT,
          userAddress,
        })) {
          fullContent += chunk;
          client.emit(AI_EVENTS.CHUNK, {
            content: chunk,
            index: chunkIndex++,
          } as ChunkPayload);
        }
      } catch (streamError) {
        this.logger.warn('Streaming failed, falling back to regular chat');
      }

      // If stream returned empty content (e.g., AI wants to call tools), fallback to regular chat
      if (!fullContent.trim()) {
        this.logger.debug('Empty stream content, using regular chat for tool handling');

        const response = await this.aiService.chat({
          messages,
          tools,
          systemPrompt: SYSTEM_PROMPT,
          userAddress,
        });

        fullContent = response.content;

        // Send content as single chunk if we have any
        if (fullContent) {
          client.emit(AI_EVENTS.CHUNK, {
            content: fullContent,
            index: 0,
          } as ChunkPayload);
        }

        // Handle tool calls if any
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            client.emit(AI_EVENTS.TOOL_CALL, toolCall);
          }

          // Execute tools
          const toolResults = await this.aiService.executeToolCalls(
            response.toolCalls,
            userAddress,
          );

          for (const result of toolResults) {
            client.emit(AI_EVENTS.TOOL_RESULT, result);
          }

          // Check for pending transaction
          const sendResult = toolResults.find((r) => r.name === 'prepare_send');
          const pendingTx = sendResult?.result?.success
            ? (sendResult.result as { data?: { preview?: unknown } }).data?.preview
            : undefined;

          // Check for pending BLIK
          const blikResult = toolResults.find((r) => r.name === 'blik_generate' || r.name === 'blik_lookup');
          const pendingBlik = blikResult?.result?.success
            ? (blikResult.result as { data?: { pendingBlik?: unknown } }).data?.pendingBlik
            : undefined;

          // Check for pending Swap
          const swapResult = toolResults.find((r) => r.name === 'prepare_swap');
          const pendingSwap = swapResult?.result?.success
            ? (swapResult.result as { data?: { pendingSwap?: unknown } }).data?.pendingSwap
            : undefined;

          // Make follow-up AI call with tool results to generate natural language response
          // Format tool results clearly for the AI to understand
          const toolResultsSummary = toolResults.map(r => {
            if (r.result.success) {
              return `${r.name}: ${JSON.stringify(r.result.data)}`;
            } else {
              return `${r.name}: Error - ${r.result.error}`;
            }
          }).join('\n');

          const followUpMessages: ChatMessage[] = [
            ...messages,
            {
              role: 'assistant' as const,
              content: `Вызываю инструменты для получения данных...`,
            },
            {
              role: 'user' as const,
              content: `[SYSTEM: Tool execution completed. Results below. Respond naturally to the user's original question using this data.]\n\n${toolResultsSummary}`,
            },
          ];

          const followUpResponse = await this.aiService.chat({
            messages: followUpMessages,
            systemPrompt: SYSTEM_PROMPT,
            userAddress,
          });

          fullContent = followUpResponse.content;

          // Send final response as chunk
          if (fullContent) {
            client.emit(AI_EVENTS.CHUNK, {
              content: fullContent,
              index: 0,
            } as ChunkPayload);
          }

          // Send done event with tool results
          client.emit(AI_EVENTS.DONE, {
            content: fullContent,
            toolCalls: response.toolCalls,
            toolResults,
            pendingTransaction: pendingTx,
            pendingBlik,
            pendingSwap,
          } as DonePayload);

          // Log response
          this.securityService.logChatResponse(
            userAddress,
            fullContent.length,
            this.aiService.activeProvider,
            Date.now() - startTime,
            requestId,
          );

          this.logger.debug(`Chat with tools completed for ${userAddress}`);
          return;
        }
      }

      // Send done event
      client.emit(AI_EVENTS.DONE, {
        content: fullContent,
      } as DonePayload);

      // Log response
      this.securityService.logChatResponse(
        userAddress,
        fullContent.length,
        this.aiService.activeProvider,
        Date.now() - startTime,
        requestId,
      );

      this.logger.debug(`Chat completed for ${userAddress}`);
    } catch (error) {
      this.logger.error(`Chat error for ${userAddress}:`, error);

      client.emit(AI_EVENTS.ERROR, {
        code: 'CHAT_ERROR',
        message: 'Failed to process message. Please try again.',
      } as ErrorPayload);
    }
  }

  /**
   * Send a suggestion to a specific user
   */
  sendSuggestion(address: string, suggestion: SuggestionPayload): void {
    const normalizedAddress = address.toLowerCase();
    this.server.to(`ai:${normalizedAddress}`).emit(AI_EVENTS.SUGGESTION, suggestion);
    this.logger.debug(`Sent suggestion to ${normalizedAddress}: ${suggestion.type}`);
  }

  /**
   * Send a suggestion to all connected users
   */
  broadcastSuggestion(suggestion: SuggestionPayload): void {
    this.server.emit(AI_EVENTS.SUGGESTION, suggestion);
    this.logger.debug(`Broadcast suggestion: ${suggestion.type}`);
  }

  /**
   * Notify user about something (used by proactive features)
   */
  notifyUser(address: string, event: string, data: unknown): void {
    const normalizedAddress = address.toLowerCase();
    this.server.to(`ai:${normalizedAddress}`).emit(event, data);
  }
}
