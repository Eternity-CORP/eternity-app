import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'groq-sdk/resources/chat/completions';
import {
  AIProvider,
  ChatMessage,
  AITool,
  AIResponse,
  ToolCall,
} from './ai-provider.interface';

@Injectable()
export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  private readonly logger = new Logger(GroqProvider.name);
  private client: Groq | null = null;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.client = new Groq({ apiKey });
      this.logger.log('Groq provider initialized');
    } else {
      this.logger.warn('Groq API key not configured');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const response = await this.client!.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return !!response.choices?.[0];
    } catch (error) {
      this.logger.error('Groq availability check failed', error);
      return false;
    }
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Groq provider not configured');
    }

    const { messages, tools, systemPrompt } = params;

    const groqMessages = this.convertMessages(messages, systemPrompt);
    const groqTools = tools ? this.convertTools(tools) : undefined;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: groqMessages,
        tools: groqTools,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const choice = response.choices[0];

      if (!choice) {
        throw new Error('No response choice from Groq');
      }

      const toolCalls = this.extractToolCalls(choice);

      return {
        content: choice.message.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason:
          choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
      };
    } catch (error) {
      this.logger.error('Groq chat error', error);
      throw error;
    }
  }

  async *stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('Groq provider not configured');
    }

    const { messages, tools, systemPrompt } = params;

    const groqMessages = this.convertMessages(messages, systemPrompt);
    const groqTools = tools ? this.convertTools(tools) : undefined;

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: groqMessages,
        tools: groqTools,
        max_tokens: 1024,
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error('Groq stream error', error);
      throw error;
    }
  }

  private convertMessages(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      result.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      });
    }

    return result;
  }

  private convertTools(tools: AITool[]): ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: tool.required ?? [],
        },
      },
    }));
  }

  private extractToolCalls(choice: {
    message: { tool_calls?: Array<{ function: { name: string; arguments: string } }> };
  }): ToolCall[] {
    if (!choice.message.tool_calls) {
      return [];
    }

    return choice.message.tool_calls.map((tc) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
  }
}
