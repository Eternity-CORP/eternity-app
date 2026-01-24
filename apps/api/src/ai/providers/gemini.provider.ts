import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  FunctionDeclaration,
  SchemaType,
  Schema,
} from '@google/generative-ai';
import {
  AIProvider,
  ChatMessage,
  AITool,
  AIResponse,
  ToolCall,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.model = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });
      this.logger.log('Gemini provider initialized');
    } else {
      this.logger.warn('Gemini API key not configured');
    }
  }

  get isConfigured(): boolean {
    return this.client !== null && this.model !== null;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const result = await this.model!.generateContent('test');
      return !!result.response;
    } catch (error) {
      this.logger.error('Gemini availability check failed', error);
      return false;
    }
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): Promise<AIResponse> {
    if (!this.model) {
      throw new Error('Gemini provider not configured');
    }

    const { messages, tools, systemPrompt } = params;

    const contents = this.convertMessages(messages);
    const functionDeclarations = tools
      ? this.convertTools(tools)
      : undefined;

    try {
      const result = await this.model.generateContent({
        contents,
        systemInstruction: systemPrompt
          ? { role: 'user', parts: [{ text: systemPrompt }] }
          : undefined,
        tools: functionDeclarations
          ? [{ functionDeclarations }]
          : undefined,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        throw new Error('No response candidate from Gemini');
      }

      const toolCalls = this.extractToolCalls(candidate.content);
      const textContent = candidate.content.parts
        .filter((part): part is Part & { text: string } => 'text' in part)
        .map((part) => part.text)
        .join('');

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      };
    } catch (error) {
      this.logger.error('Gemini chat error', error);
      throw error;
    }
  }

  async *stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): AsyncIterable<string> {
    if (!this.model) {
      throw new Error('Gemini provider not configured');
    }

    const { messages, tools, systemPrompt } = params;

    const contents = this.convertMessages(messages);
    const functionDeclarations = tools
      ? this.convertTools(tools)
      : undefined;

    try {
      const result = await this.model.generateContentStream({
        contents,
        systemInstruction: systemPrompt
          ? { role: 'user', parts: [{ text: systemPrompt }] }
          : undefined,
        tools: functionDeclarations
          ? [{ functionDeclarations }]
          : undefined,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error('Gemini stream error', error);
      throw error;
    }
  }

  private convertMessages(messages: ChatMessage[]): Content[] {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  private convertTools(tools: AITool[]): FunctionDeclaration[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: tool.parameters as { [k: string]: Schema },
        required: Object.keys(tool.parameters),
      },
    }));
  }

  private extractToolCalls(content: Content): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    for (const part of content.parts) {
      if ('functionCall' in part && part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          arguments: part.functionCall.args as Record<string, unknown>,
        });
      }
    }

    return toolCalls;
  }
}
