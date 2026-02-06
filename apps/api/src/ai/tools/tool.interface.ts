/**
 * Base interface for AI tool parameters
 */
export interface ToolParams {
  userAddress: string;
  [key: string]: unknown;
}

/**
 * Result returned by tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Tool definition for AI providers
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolPropertyDefinition>;
    required: string[];
  };
}

/**
 * Property definition for tool parameters
 */
export interface ToolPropertyDefinition {
  type: 'string' | 'number' | 'boolean';
  description: string;
  enum?: string[];
}

/**
 * Interface for AI tools
 */
export interface AIToolHandler {
  readonly name: string;
  readonly definition: ToolDefinition;
  execute(params: ToolParams): Promise<ToolResult>;
}
