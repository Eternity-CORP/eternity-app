import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import {
  AIProvider,
  ChatMessage,
  AITool,
  AIResponse,
} from './providers/ai-provider.interface';

interface FallbackConfig {
  enabled: boolean;
  maxConsecutiveErrors: number;
  timeoutMs: number;
}

interface ProviderHealth {
  consecutiveErrors: number;
  lastError?: Date;
  isHealthy: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: Map<string, AIProvider> = new Map();
  private readonly providerHealth: Map<string, ProviderHealth> = new Map();
  private readonly fallbackConfig: FallbackConfig;
  private currentProvider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
  ) {
    // Register providers
    if (geminiProvider.isConfigured) {
      this.providers.set('gemini', geminiProvider);
      this.providerHealth.set('gemini', {
        consecutiveErrors: 0,
        isHealthy: true,
      });
    }

    if (groqProvider.isConfigured) {
      this.providers.set('groq', groqProvider);
      this.providerHealth.set('groq', {
        consecutiveErrors: 0,
        isHealthy: true,
      });
    }

    // Set primary provider
    this.currentProvider = geminiProvider.isConfigured ? 'gemini' : 'groq';

    // Fallback configuration
    this.fallbackConfig = {
      enabled: true,
      maxConsecutiveErrors: 3,
      timeoutMs: 10000,
    };

    this.logger.log(
      `AI Service initialized with providers: ${[...this.providers.keys()].join(', ')}`,
    );
    this.logger.log(`Primary provider: ${this.currentProvider}`);
  }

  get availableProviders(): string[] {
    return [...this.providers.keys()];
  }

  get activeProvider(): string {
    return this.currentProvider;
  }

  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, { configured: boolean; healthy: boolean }>;
    activeProvider: string;
  }> {
    const providersHealth: Record<
      string,
      { configured: boolean; healthy: boolean }
    > = {};

    for (const [name, provider] of this.providers) {
      const health = this.providerHealth.get(name);
      providersHealth[name] = {
        configured: provider.isConfigured,
        healthy: health?.isHealthy ?? false,
      };
    }

    // Check if at least one provider is healthy
    const hasHealthyProvider = [...this.providerHealth.values()].some(
      (h) => h.isHealthy,
    );

    const allHealthy = [...this.providerHealth.values()].every(
      (h) => h.isHealthy,
    );

    return {
      status: allHealthy ? 'healthy' : hasHealthyProvider ? 'degraded' : 'unhealthy',
      providers: providersHealth,
      activeProvider: this.currentProvider,
    };
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
    userAddress?: string;
  }): Promise<AIResponse> {
    const { messages, tools, systemPrompt } = params;

    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }

    try {
      const response = await this.executeWithTimeout(
        provider.chat({ messages, tools, systemPrompt }),
        this.fallbackConfig.timeoutMs,
      );

      this.recordSuccess(this.currentProvider);
      return response;
    } catch (error) {
      this.recordError(this.currentProvider, error as Error);

      // Try fallback if enabled
      if (this.fallbackConfig.enabled) {
        const fallbackProvider = this.getFallbackProvider();
        if (fallbackProvider) {
          this.logger.warn(
            `Falling back from ${this.currentProvider} to ${fallbackProvider.name}`,
          );

          try {
            const response = await this.executeWithTimeout(
              fallbackProvider.chat({ messages, tools, systemPrompt }),
              this.fallbackConfig.timeoutMs,
            );

            this.recordSuccess(fallbackProvider.name);
            this.currentProvider = fallbackProvider.name;
            return response;
          } catch (fallbackError) {
            this.recordError(fallbackProvider.name, fallbackError as Error);
            throw fallbackError;
          }
        }
      }

      throw error;
    }
  }

  async *stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
    userAddress?: string;
  }): AsyncIterable<string> {
    const { messages, tools, systemPrompt } = params;

    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No AI provider available');
    }

    try {
      for await (const chunk of provider.stream({
        messages,
        tools,
        systemPrompt,
      })) {
        yield chunk;
      }
      this.recordSuccess(this.currentProvider);
    } catch (error) {
      this.recordError(this.currentProvider, error as Error);

      // Try fallback for stream
      if (this.fallbackConfig.enabled) {
        const fallbackProvider = this.getFallbackProvider();
        if (fallbackProvider) {
          this.logger.warn(
            `Stream falling back from ${this.currentProvider} to ${fallbackProvider.name}`,
          );

          try {
            for await (const chunk of fallbackProvider.stream({
              messages,
              tools,
              systemPrompt,
            })) {
              yield chunk;
            }
            this.recordSuccess(fallbackProvider.name);
            this.currentProvider = fallbackProvider.name;
            return;
          } catch (fallbackError) {
            this.recordError(fallbackProvider.name, fallbackError as Error);
            throw fallbackError;
          }
        }
      }

      throw error;
    }
  }

  private getActiveProvider(): AIProvider | undefined {
    const provider = this.providers.get(this.currentProvider);
    const health = this.providerHealth.get(this.currentProvider);

    if (provider && health?.isHealthy) {
      return provider;
    }

    // If current provider is unhealthy, try to find a healthy one
    for (const [name, p] of this.providers) {
      const h = this.providerHealth.get(name);
      if (h?.isHealthy) {
        this.currentProvider = name;
        return p;
      }
    }

    // Return any available provider as last resort
    return this.providers.get(this.currentProvider);
  }

  private getFallbackProvider(): AIProvider | undefined {
    for (const [name, provider] of this.providers) {
      if (name !== this.currentProvider) {
        const health = this.providerHealth.get(name);
        if (health?.isHealthy) {
          return provider;
        }
      }
    }
    return undefined;
  }

  private recordSuccess(providerName: string): void {
    const health = this.providerHealth.get(providerName);
    if (health) {
      health.consecutiveErrors = 0;
      health.isHealthy = true;
    }
  }

  private recordError(providerName: string, error: Error): void {
    const health = this.providerHealth.get(providerName);
    if (health) {
      health.consecutiveErrors++;
      health.lastError = new Date();

      if (health.consecutiveErrors >= this.fallbackConfig.maxConsecutiveErrors) {
        health.isHealthy = false;
        this.logger.error(
          `Provider ${providerName} marked as unhealthy after ${health.consecutiveErrors} consecutive errors`,
        );

        // Schedule health recovery check
        setTimeout(() => {
          this.recoverProvider(providerName);
        }, 60000); // Try to recover after 1 minute
      }
    }

    this.logger.error(`Provider ${providerName} error: ${error.message}`);
  }

  private async recoverProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    const health = this.providerHealth.get(providerName);

    if (provider && health && !health.isHealthy) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          health.isHealthy = true;
          health.consecutiveErrors = 0;
          this.logger.log(`Provider ${providerName} recovered`);
        }
      } catch {
        // Still unhealthy, schedule another check
        setTimeout(() => {
          this.recoverProvider(providerName);
        }, 60000);
      }
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}
