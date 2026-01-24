export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface AIProviderConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): Promise<AIResponse>;

  stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): AsyncIterable<string>;

  isAvailable(): Promise<boolean>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
