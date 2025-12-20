import { Injectable } from '@nestjs/common';
import { ICrosschainRouter } from '../../interfaces/CrosschainRouter.interface';
import {
  CrosschainQuoteParams,
  CrosschainQuote,
  CrosschainExecuteParams,
  CrosschainTransactionData,
  CrosschainTransactionStatus,
  RouteInfo,
  TokenInfo,
  RouteStep,
} from '../../types/crosschain.types';

/**
 * LI.FI Router - интеграция с LI.FI API
 * Документация: https://docs.li.fi/
 * SDK: @lifi/sdk или @lifi/types
 */
@Injectable()
export class LifiRouterService implements ICrosschainRouter {
  readonly name = 'LI.FI';
  readonly supportedChainTypes = ['EVM'];

  private apiUrl = 'https://li.quest/v1';
  private readonly apiKey?: string;

  // Маппинг наших chainId на LI.FI chainId
  private readonly chainIdMap: Record<string, number> = {
    ethereum: 1,
    mainnet: 1,
    polygon: 137,
    bsc: 56,
    arbitrum: 42161,
    optimism: 10,
    avalanche: 43114,
    base: 8453,
    gnosis: 100,
    // Testnets (LI.FI не поддерживает, но добавляем для fallback)
    sepolia: 11155111,
    holesky: 17000,
    goerli: 5,
  };

  constructor() {
    this.apiKey = process.env.LIFI_API_KEY;
  }

  /**
   * Получение котировки от LI.FI
   */
  async getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote> {
    try {
      // Конвертация chainId в числовой формат LI.FI
      const fromChainId = this.chainIdMap[params.fromChainId.toLowerCase()];
      const toChainId = this.chainIdMap[params.toChainId.toLowerCase()];

      if (!fromChainId || !toChainId) {
        throw new Error(
          `Unsupported chain: ${params.fromChainId} or ${params.toChainId}`
        );
      }

      // Запрос к LI.FI API
      // Документация: https://docs.li.fi/integrate-li.fi-js-sdk/request-a-quote
      const response = await this.makeRequest<LifiQuoteResponse>('/quote', {
        method: 'GET',
        params: {
          fromChain: fromChainId,
          toChain: toChainId,
          fromToken: params.fromTokenAddress,
          toToken: params.toTokenAddress,
          fromAmount: params.amount,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          slippage: params.slippage || 0.5, // 0.5%
          integrator: 'eternity-wallet', // Ваш идентификатор
        },
      });

      // Парсинг ответа LI.FI
      return this.parseQuoteResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Подготовка транзакции для подписи
   */
  async prepareTransaction(
    params: CrosschainExecuteParams
  ): Promise<CrosschainTransactionData> {
    try {
      // Получение данных транзакции из LI.FI
      // Документация: https://docs.li.fi/integrate-li.fi-js-sdk/execute-a-route
      const response = await this.makeRequest<LifiTransactionResponse>(
        '/transactionRequest',
        {
          method: 'POST',
          body: {
            routeId: params.routeId,
            fromAddress: params.fromAddress,
            toAddress: params.toAddress,
          },
        }
      );

      return {
        to: response.to,
        data: response.data,
        value: response.value,
        chainId: response.chainId.toString(),
        gasLimit: response.gasLimit,
        gasPrice: response.gasPrice,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Получение статуса транзакции
   */
  async getTransactionStatus(
    txHash: string
  ): Promise<CrosschainTransactionStatus> {
    try {
      // Документация: https://docs.li.fi/integrate-li.fi-js-sdk/track-transaction-status
      const response = await this.makeRequest<LifiStatusResponse>(
        `/status?txHash=${txHash}`,
        { method: 'GET' }
      );

      return {
        status: this.mapStatus(response.status),
        fromTxHash: response.sending?.txHash,
        toTxHash: response.receiving?.txHash,
        currentStep: response.substatus ? 1 : 0,
        totalSteps: 2,
        message: response.substatusMessage,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Проверка поддержки маршрута
   */
  async supportsRoute(
    fromChainId: string,
    toChainId: string
  ): Promise<boolean> {
    const fromChain = this.chainIdMap[fromChainId.toLowerCase()];
    const toChain = this.chainIdMap[toChainId.toLowerCase()];

    // Если оба chainId известны и это EVM сети - поддерживается
    return !!(fromChain && toChain);
  }

  /**
   * Парсинг ответа котировки от LI.FI
   * @private
   */
  private parseQuoteResponse(response: LifiQuoteResponse): CrosschainQuote {
    if (!response.routes || response.routes.length === 0) {
      throw new Error('No routes found');
    }

    const route = response.routes[0]; // Берём лучший маршрут

    return {
      estimatedOutput: route.toAmount,
      fee: this.calculateTotalFees(route),
      feeToken: route.steps[0].estimate.gasCosts[0]?.token?.symbol || 'ETH',
      route: this.buildRouteInfo(route),
      durationSeconds: route.steps.reduce(
        (sum, step) => sum + (step.estimate.executionDuration || 0),
        0
      ),
      priceImpact: route.tags?.includes('HIGH_PRICE_IMPACT')
        ? 'high'
        : undefined,
    };
  }

  /**
   * Построение информации о маршруте
   * @private
   */
  private buildRouteInfo(route: any): RouteInfo {
    return {
      id: route.id,
      fromChain: {
        id: route.fromChainId.toString(),
        name: route.fromChain || 'Unknown',
        chainType: 'EVM',
      },
      toChain: {
        id: route.toChainId.toString(),
        name: route.toChain || 'Unknown',
        chainType: 'EVM',
      },
      fromToken: this.buildTokenInfo(route.fromToken),
      toToken: this.buildTokenInfo(route.toToken),
      steps: route.steps.map((step: any) => this.buildRouteStep(step)),
      tags: route.tags,
    };
  }

  /**
   * Построение информации о токене
   * @private
   */
  private buildTokenInfo(token: any): TokenInfo {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      chainId: token.chainId.toString(),
      name: token.name,
      logoURI: token.logoURI,
    };
  }

  /**
   * Построение шага маршрута
   * @private
   */
  private buildRouteStep(step: any): RouteStep {
    return {
      type: step.type === 'cross' ? 'bridge' : 'swap',
      tool: step.tool,
      fromToken: this.buildTokenInfo(step.action.fromToken),
      toToken: this.buildTokenInfo(step.action.toToken),
      estimatedGas: step.estimate.gasCosts[0]?.amount,
    };
  }

  /**
   * Расчёт общих комиссий
   * @private
   */
  private calculateTotalFees(route: any): string {
    let totalFee = 0;

    route.steps.forEach((step: any) => {
      step.estimate.gasCosts.forEach((gas: any) => {
        totalFee += parseFloat(gas.amountUSD || '0');
      });

      step.estimate.feeCosts?.forEach((fee: any) => {
        totalFee += parseFloat(fee.amountUSD || '0');
      });
    });

    return totalFee.toFixed(2);
  }

  /**
   * Маппинг статуса LI.FI на наш формат
   * @private
   */
  private mapStatus(
    status: string
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, any> = {
      NOT_FOUND: 'pending',
      PENDING: 'processing',
      DONE: 'completed',
      FAILED: 'failed',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * HTTP запрос к LI.FI API
   * @private
   */
  private async makeRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST';
      params?: Record<string, any>;
      body?: Record<string, any>;
    }
  ): Promise<T> {
    const url = new URL(`${this.apiUrl}${endpoint}`);

    // Добавление query параметров для GET
    if (options.method === 'GET' && options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Добавление API ключа если есть
    if (this.apiKey) {
      headers['x-lifi-api-key'] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `LI.FI API error: ${response.status} - ${error.message || 'Unknown error'}`
      );
    }

    return response.json();
  }

  /**
   * Обработка ошибок
   * @private
   */
  private handleError(error: any): Error {
    if (error.message?.includes('No routes found')) {
      return new Error('ROUTE_NOT_FOUND: No crosschain route available');
    }

    if (error.message?.includes('Unsupported chain')) {
      return new Error('UNSUPPORTED_CHAIN: Chain not supported by LI.FI');
    }

    return new Error(`LIFI_ERROR: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Типы ответов LI.FI API
 * Полная документация типов: https://docs.li.fi/li.fi-api/li.fi-api-reference
 */
interface LifiQuoteResponse {
  routes: Array<{
    id: string;
    fromChainId: number;
    toChainId: number;
    fromChain: string;
    toChain: string;
    fromToken: any;
    toToken: any;
    fromAmount: string;
    toAmount: string;
    steps: Array<{
      type: string;
      tool: string;
      action: {
        fromToken: any;
        toToken: any;
      };
      estimate: {
        executionDuration: number;
        gasCosts: Array<{
          amount: string;
          amountUSD: string;
          token: any;
        }>;
        feeCosts?: Array<{
          amount: string;
          amountUSD: string;
        }>;
      };
    }>;
    tags?: string[];
  }>;
}

interface LifiTransactionResponse {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit?: string;
  gasPrice?: string;
}

interface LifiStatusResponse {
  status: string;
  substatus?: string;
  substatusMessage?: string;
  sending?: {
    txHash: string;
  };
  receiving?: {
    txHash: string;
  };
}

// Backward compatibility export
export { LifiRouterService as LifiRouter };
