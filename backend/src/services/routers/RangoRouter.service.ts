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
 * Rango Router - интеграция с Rango Exchange API
 * Документация: https://docs.rango.exchange/
 * API Reference: https://api.rango.exchange/
 * SDK: @rango-dev/rango-sdk (опционально)
 *
 * Поддерживает: EVM, Solana, Tron, Bitcoin, Cosmos и другие
 */
@Injectable()
export class RangoRouterService implements ICrosschainRouter {
  readonly name = 'Rango';
  readonly supportedChainTypes = ['EVM', 'SVM', 'TRON', 'BTC', 'COSMOS'];

  private apiUrl = 'https://api.rango.exchange';
  private readonly apiKey?: string;

  // Маппинг наших chainId на Rango blockchain names
  // Документация: https://docs.rango.exchange/api-integration/main-api/basic/meta
  private readonly chainIdMap: Record<string, string> = {
    // EVM chains
    ethereum: 'ETH',
    polygon: 'POLYGON',
    bsc: 'BSC',
    arbitrum: 'ARBITRUM',
    optimism: 'OPTIMISM',
    avalanche: 'AVAX_CCHAIN',
    base: 'BASE',
    
    // Non-EVM chains
    solana: 'SOLANA',
    tron: 'TRON',
    bitcoin: 'BTC',
    cosmos: 'COSMOS',
    osmosis: 'OSMOSIS',
    thorchain: 'THOR',
    maya: 'MAYA',
  };

  constructor() {
    this.apiKey = process.env.RANGO_API_KEY;
  }

  /**
   * Получение котировки от Rango
   * API Endpoint: POST /basic/swap
   * Документация: https://docs.rango.exchange/api-integration/main-api/basic/swap
   */
  async getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote> {
    try {
      // Конвертация chainId в формат Rango
      const fromBlockchain = this.chainIdMap[params.fromChainId.toLowerCase()];
      const toBlockchain = this.chainIdMap[params.toChainId.toLowerCase()];

      if (!fromBlockchain || !toBlockchain) {
        throw new Error(
          `Unsupported chain: ${params.fromChainId} or ${params.toChainId}`
        );
      }

      // Запрос к Rango API
      // Документация: https://docs.rango.exchange/api-integration/main-api/basic/swap
      const response = await this.makeRequest<RangoSwapResponse>('/basic/swap', {
        method: 'POST',
        body: {
          from: {
            blockchain: fromBlockchain,
            symbol: this.extractSymbol(params.fromTokenAddress),
            address: params.fromTokenAddress === '0x0000000000000000000000000000000000000000' 
              ? null 
              : params.fromTokenAddress,
          },
          to: {
            blockchain: toBlockchain,
            symbol: this.extractSymbol(params.toTokenAddress),
            address: params.toTokenAddress === '0x0000000000000000000000000000000000000000'
              ? null
              : params.toTokenAddress,
          },
          amount: params.amount,
          fromAddress: params.fromAddress,
          toAddress: params.toAddress,
          slippage: params.slippage || 1.0, // Rango использует проценты (1.0 = 1%)
          disableEstimate: false,
          // Опционально: можно указать предпочтительные DEX/bridges
          // selectedWallets: { ... }
        },
      });

      // Парсинг ответа Rango
      return this.parseSwapResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Подготовка транзакции для подписи
   * API Endpoint: POST /basic/create-transaction
   * Документация: https://docs.rango.exchange/api-integration/main-api/basic/create-transaction
   */
  async prepareTransaction(
    params: CrosschainExecuteParams
  ): Promise<CrosschainTransactionData> {
    try {
      // Получение данных транзакции из Rango
      const response = await this.makeRequest<RangoTransactionResponse>(
        '/basic/create-transaction',
        {
          method: 'POST',
          body: {
            requestId: params.routeId,
            step: 1, // Первый шаг маршрута
            userSettings: {
              slippage: '1.0',
            },
            validations: {
              balance: true,
              fee: true,
            },
          },
        }
      );

      // Rango возвращает разные форматы для разных сетей
      if (response.transaction) {
        return {
          to: response.transaction.to || '',
          data: response.transaction.data || '0x',
          value: response.transaction.value || '0',
          chainId: response.transaction.chainId || '',
          gasLimit: response.transaction.gasLimit,
          gasPrice: response.transaction.gasPrice,
        };
      }

      throw new Error('Invalid transaction response from Rango');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Получение статуса транзакции
   * API Endpoint: GET /basic/status
   * Документация: https://docs.rango.exchange/api-integration/main-api/basic/status
   */
  async getTransactionStatus(
    txHash: string
  ): Promise<CrosschainTransactionStatus> {
    try {
      const response = await this.makeRequest<RangoStatusResponse>(
        `/basic/status?requestId=${txHash}&txId=${txHash}`,
        { method: 'GET' }
      );

      return {
        status: this.mapStatus(response.status),
        fromTxHash: response.explorerUrl?.[0]?.url,
        toTxHash: response.explorerUrl?.[response.explorerUrl.length - 1]?.url,
        currentStep: response.currentStep || 0,
        totalSteps: response.totalSteps || 0,
        message: response.error || response.diagnosisMessage,
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

    // Если оба chainId известны - поддерживается
    return !!(fromChain && toChain);
  }

  /**
   * Парсинг ответа swap от Rango
   * @private
   */
  private parseSwapResponse(response: RangoSwapResponse): CrosschainQuote {
    if (!response.route || response.route.length === 0) {
      throw new Error('No routes found');
    }

    const route = response.route[0]; // Берём лучший маршрут

    return {
      estimatedOutput: route.outputAmount,
      fee: this.calculateTotalFees(route),
      feeToken: route.fee?.[0]?.name || 'Unknown',
      route: this.buildRouteInfo(route, response.requestId),
      durationSeconds: route.estimatedTimeInSeconds || 300,
      priceImpact: route.priceImpact,
    };
  }

  /**
   * Построение информации о маршруте
   * @private
   */
  private buildRouteInfo(route: any, requestId: string): RouteInfo {
    return {
      id: requestId,
      fromChain: {
        id: route.from.blockchain,
        name: route.from.blockchainDisplayName || route.from.blockchain,
        chainType: this.getChainType(route.from.blockchain),
      },
      toChain: {
        id: route.to.blockchain,
        name: route.to.blockchainDisplayName || route.to.blockchain,
        chainType: this.getChainType(route.to.blockchain),
      },
      fromToken: this.buildTokenInfo(route.from),
      toToken: this.buildTokenInfo(route.to),
      steps: route.swaps?.map((swap: any) => this.buildRouteStep(swap)) || [],
      tags: route.tags,
    };
  }

  /**
   * Построение информации о токене
   * @private
   */
  private buildTokenInfo(token: any): TokenInfo {
    return {
      address: token.address || '0x0000000000000000000000000000000000000000',
      symbol: token.symbol,
      decimals: token.decimals || 18,
      chainId: token.blockchain,
      name: token.name,
      logoURI: token.image,
    };
  }

  /**
   * Построение шага маршрута
   * @private
   */
  private buildRouteStep(swap: any): RouteStep {
    return {
      type: swap.swapperType === 'BRIDGE' ? 'bridge' : 'swap',
      tool: swap.swapperId,
      fromToken: this.buildTokenInfo(swap.from),
      toToken: this.buildTokenInfo(swap.to),
      estimatedGas: swap.fee?.[0]?.amount,
    };
  }

  /**
   * Расчёт общих комиссий
   * @private
   */
  private calculateTotalFees(route: any): string {
    let totalFee = 0;

    route.fee?.forEach((fee: any) => {
      totalFee += parseFloat(fee.usdPrice || '0');
    });

    return totalFee.toFixed(2);
  }

  /**
   * Определение типа сети
   * @private
   */
  private getChainType(blockchain: string): 'EVM' | 'SVM' | 'OTHER' {
    if (blockchain === 'SOLANA') return 'SVM';
    if (['ETH', 'POLYGON', 'BSC', 'ARBITRUM', 'OPTIMISM', 'AVAX_CCHAIN', 'BASE'].includes(blockchain)) {
      return 'EVM';
    }
    return 'OTHER';
  }

  /**
   * Маппинг статуса Rango на наш формат
   * @private
   */
  private mapStatus(
    status: string
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, any> = {
      RUNNING: 'processing',
      SUCCESS: 'completed',
      FAILED: 'failed',
      PENDING: 'pending',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Извлечение символа токена из адреса (для native токенов)
   * @private
   */
  private extractSymbol(address: string): string | null {
    // Для native токенов возвращаем null, Rango сам определит
    if (address === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    // Для токенов нужно получить symbol из metadata
    // TODO: добавить кэш токенов или запрос к Rango /tokens
    return null;
  }

  /**
   * HTTP запрос к Rango API
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
    const url = `${this.apiUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Добавление API ключа если есть
    // Документация: https://docs.rango.exchange/api-integration/authentication
    if (this.apiKey) {
      headers['apiKey'] = this.apiKey;
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Rango API error: ${response.status} - ${error.message || error.error || 'Unknown error'}`
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
      return new Error('UNSUPPORTED_CHAIN: Chain not supported by Rango');
    }

    return new Error(`RANGO_ERROR: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Типы ответов Rango API
 * Полная документация: https://docs.rango.exchange/api-integration/main-api
 */
interface RangoSwapResponse {
  requestId: string;
  route: Array<{
    from: {
      blockchain: string;
      blockchainDisplayName?: string;
      symbol: string;
      address: string | null;
      decimals: number;
      name: string;
      image: string;
    };
    to: {
      blockchain: string;
      blockchainDisplayName?: string;
      symbol: string;
      address: string | null;
      decimals: number;
      name: string;
      image: string;
    };
    outputAmount: string;
    estimatedTimeInSeconds: number;
    fee: Array<{
      name: string;
      amount: string;
      usdPrice: string;
    }>;
    priceImpact: string;
    swaps?: Array<{
      swapperId: string;
      swapperType: string;
      from: any;
      to: any;
      fee?: any[];
    }>;
    tags?: string[];
  }>;
}

interface RangoTransactionResponse {
  transaction?: {
    to: string;
    data: string;
    value: string;
    chainId: string;
    gasLimit?: string;
    gasPrice?: string;
  };
  error?: string;
}

interface RangoStatusResponse {
  status: string;
  currentStep?: number;
  totalSteps?: number;
  explorerUrl?: Array<{
    url: string;
  }>;
  error?: string;
  diagnosisMessage?: string;
}
