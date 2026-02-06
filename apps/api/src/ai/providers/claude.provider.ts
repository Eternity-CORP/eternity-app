import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  ChatMessage,
  AITool,
  AIResponse,
  ToolCall,
} from './ai-provider.interface';

const COMPLEX_QUERY_PATTERNS =
  /\b(explain|analyze|analyse|compare|why|how does|how do|how can|how to|describe|elaborate|detail|помоги|объясни|почему|расскажи|как работает|сравни|проанализируй|опиши)\b/i;

@Injectable()
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private readonly logger = new Logger(ClaudeProvider.name);
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Claude provider initialized');
    } else {
      this.logger.warn('Anthropic API key not configured');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const response = await this.client!.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      });
      return !!response.content;
    } catch (error) {
      this.logger.error('Claude availability check failed', error);
      return false;
    }
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Claude provider not configured');
    }

    const { messages, tools, systemPrompt } = params;
    const model = this.selectModel(messages);
    const anthropicMessages = this.convertMessages(messages);
    const anthropicTools = tools?.length ? this.convertTools(tools) : undefined;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 1024,
        messages: anthropicMessages,
        system: systemPrompt || undefined,
        tools: anthropicTools,
        temperature: 0.7,
      });

      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('Claude chat error', error);
      throw error;
    }
  }

  async *stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('Claude provider not configured');
    }

    if (params.tools?.length) {
      return;
    }

    const { messages, systemPrompt } = params;
    const model = this.selectModel(messages);
    const anthropicMessages = this.convertMessages(messages);

    try {
      const stream = await this.client.messages.create({
        model,
        max_tokens: 1024,
        messages: anthropicMessages,
        system: systemPrompt || undefined,
        temperature: 0.7,
        stream: true,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } catch (error) {
      this.logger.error('Claude stream error', error);
      throw error;
    }
  }

  private selectModel(messages: ChatMessage[]): string {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (lastUserMessage && COMPLEX_QUERY_PATTERNS.test(lastUserMessage.content)) {
      return 'claude-sonnet-4-5-20250929';
    }

    return 'claude-haiku-4-5-20251001';
  }

  private convertMessages(
    messages: ChatMessage[],
  ): Anthropic.MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }

  private convertTools(tools: AITool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters,
        required: tool.required ?? [],
      },
    }));
  }

  private parseResponse(response: Anthropic.Message): AIResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    let finishReason: AIResponse['finishReason'];
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_calls';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    } else {
      finishReason = 'stop';
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    };
  }
}
