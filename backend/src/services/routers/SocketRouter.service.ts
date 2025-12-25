import { Injectable, Logger } from '@nestjs/common';
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
 * Socket Router - интеграция с Socket.tech API
 * Документация: https://docs.socket.tech/
 * Документация Bungee: https://docs.bungee.exchange/
 * API Reference: https://api.socket.tech/
 *
 * Socket поддерживает:
 * - 15+ EVM chains (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, etc.)
 * - Solana
 * - 200+ bridges и DEXs
 *
 * По умолчанию использует публичный API ключ для тестирования.
 * Для production получите личный ключ на https://socket.tech/
 */
@Injectable()
export class SocketRouterService implements ICrosschainRouter {
  private readonly logger = new Logger(SocketRouterService.name);
  readonly name = 'Socket';
  readonly supportedChainTypes = ['EVM', 'SVM'];

  private apiUrl = 'https://api.socket.tech/v2';
  private readonly apiKey: string;

  // Маппинг наших chainId на Socket chainId
  // Документация: https://docs.socket.tech/socket-api/v2/guides/supported-chains
  private readonly chainIdMap: Record<string, number> = {
    // EVM chains
    ethereum: 1,
    mainnet: 1,
    polygon: 137,
    bsc: 56,
    arbitrum: 42161,
    optimism: 10,
    avalanche: 43114,
    base: 8453,
    gnosis: 100,
    fantom: 250,
    zksync: 324,
    polygonzkevm: 1101,
    linea: 59144,
    scroll: 534352,
    mantle: 5000,

    // Testnets (Socket не поддерживает, но добавляем для fallback)
    sepolia: 11155111,
    holesky: 17000,
    goerli: 5,

    // Non-EVM chains
    solana: 1151111081099710, // Socket's Solana chain ID
  };

  constructor() {
    // Используем публичный API ключ Socket.tech для тестирования
    // Документация: https://docs.bungee.exchange/
    // Для production замените на свой ключ в .env: SOCKET_API_KEY=your_key
    this.apiKey = process.env.SOCKET_API_KEY || '72a5b4b0-e727-48be-8aa1-5da9d62fe635';

    if (!process.env.SOCKET_API_KEY) {
      this.logger.warn('Using public API key for testing. Set SOCKET_API_KEY in .env for production.');
    }
  }

  /**
   * Получение котировки от Socket
   * API Endpoint: GET /quote
   * Документация: https://docs.socket.tech/socket-api/v2/guides/getting-quote
   */
  async getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote> {
    try {
      // Конвертация chainId в формат Socket
      const fromChainId = this.chainIdMap[params.fromChainId.toLowerCase()];
      const toChainId = this.chainIdMap[params.toChainId.toLowerCase()];

      if (!fromChainId || !toChainId) {
        throw new Error(
          `Unsupported chain: ${params.fromChainId} or ${params.toChainId}`
        );
      }

      // Запрос к Socket API
      const response = await this.makeRequest<SocketQuoteResponse>('/quote', {
        method: 'GET',
        params: {
          fromChainId: fromChainId,
          toChainId: toChainId,
          fromTokenAddress: params.fromTokenAddress,
          toTokenAddress: params.toTokenAddress,
          fromAmount: params.amount,
          userAddress: params.fromAddress,
          recipient: params.toAddress,
          uniqueRoutesPerBridge: true, // Получить лучший маршрут от каждого bridge
          sort: 'output', // Сортировка по максимальному выходу
          singleTxOnly: true, // Только single-transaction bridges для простоты
        },
      });

      // Парсинг ответа Socket
      return this.parseQuoteResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Подготовка транзакции для подписи
   * API Endpoint: POST /build-tx
   * Документация: https://docs.socket.tech/socket-api/v2/guides/building-transaction
   */
  async prepareTransaction(
    params: CrosschainExecuteParams
  ): Promise<CrosschainTransactionData> {
    try {
      // Socket требует route object для build-tx
      // routeId у нас это JSON строка с полными данными маршрута
      const route = JSON.parse(params.routeId);

      const response = await this.makeRequest<SocketBuildTxResponse>(
        '/build-tx',
        {
          method: 'POST',
          body: {
            route: route,
          },
        }
      );

      // Socket возвращает данные транзакции
      if (response.result) {
        return {
          to: response.result.txTarget,
          data: response.result.txData,
          value: response.result.value,
          chainId: response.result.chainId.toString(),
          gasLimit: response.result.gasLimit?.toString(),
          gasPrice: response.result.gasPrice?.toString(),
        };
      }

      throw new Error('Invalid transaction response from Socket');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Получение статуса транзакции
   * API Endpoint: GET /bridge/status
   * Документация: https://docs.socket.tech/socket-api/v2/guides/checking-status
   */
  async getTransactionStatus(
    txHash: string
  ): Promise<CrosschainTransactionStatus> {
    try {
      const response = await this.makeRequest<SocketStatusResponse>(
        `/bridge/status?transactionHash=${txHash}&fromChainId=1&toChainId=137`,
        { method: 'GET' }
      );

      return {
        status: this.mapStatus(response.result?.status),
        fromTxHash: response.result?.sourceTxHash,
        toTxHash: response.result?.destinationTxHash,
        currentStep: response.result?.currentStep || 0,
        totalSteps: response.result?.totalSteps || 0,
        message: response.result?.statusMessage,
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
   * Парсинг ответа quote от Socket
   * @private
   */
  private parseQuoteResponse(
    response: SocketQuoteResponse
  ): CrosschainQuote {
    if (!response.result?.routes || response.result.routes.length === 0) {
      throw new Error('No routes found');
    }

    const route = response.result.routes[0]; // Лучший маршрут

    return {
      estimatedOutput: route.toAmount,
      fee: this.calculateTotalFees(route),
      feeToken: route.userTxs[0]?.gasFees?.asset?.symbol || 'ETH',
      route: this.buildRouteInfo(route),
      durationSeconds: route.serviceTime || 300,
      priceImpact: route.integratorFee?.amount
        ? (parseFloat(route.integratorFee.amount) / parseFloat(route.fromAmount) * 100).toFixed(2)
        : undefined,
    };
  }

  /**
   * Построение информации о маршруте
   * @private
   */
  private buildRouteInfo(route: any): RouteInfo {
    return {
      // Сохраняем весь route как ID для последующего build-tx
      id: JSON.stringify(route),
      fromChain: {
        id: route.fromChainId.toString(),
        name: this.getChainName(route.fromChainId),
        chainType: this.getChainType(route.fromChainId),
      },
      toChain: {
        id: route.toChainId.toString(),
        name: this.getChainName(route.toChainId),
        chainType: this.getChainType(route.toChainId),
      },
      fromToken: this.buildTokenInfo(route.fromAsset, route.fromChainId),
      toToken: this.buildTokenInfo(route.toAsset, route.toChainId),
      steps: route.userTxs?.map((tx: any) => this.buildRouteStep(tx)) || [],
      tags: route.usedBridgeNames || [],
    };
  }

  /**
   * Построение информации о токене
   * @private
   */
  private buildTokenInfo(token: any, chainId: number): TokenInfo {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      chainId: chainId.toString(),
      name: token.name,
      logoURI: token.icon,
    };
  }

  /**
   * Построение шага маршрута
   * @private
   */
  private buildRouteStep(userTx: any): RouteStep {
    return {
      type: userTx.userTxType === 'fund-movr' ? 'bridge' : 'swap',
      tool: userTx.protocol?.displayName || 'Unknown',
      fromToken: userTx.fromAsset ? this.buildTokenInfo(userTx.fromAsset, userTx.chainId) : {} as TokenInfo,
      toToken: userTx.toAsset ? this.buildTokenInfo(userTx.toAsset, userTx.chainId) : {} as TokenInfo,
      estimatedGas: userTx.gasFees?.amount,
    };
  }

  /**
   * Расчёт общих комиссий в USD
   * @private
   */
  private calculateTotalFees(route: any): string {
    let totalFee = 0;

    // Gas fees
    route.userTxs?.forEach((tx: any) => {
      if (tx.gasFees?.amountInUsd) {
        totalFee += parseFloat(tx.gasFees.amountInUsd);
      }
    });

    // Protocol fees
    if (route.integratorFee?.amountInUsd) {
      totalFee += parseFloat(route.integratorFee.amountInUsd);
    }

    return totalFee.toFixed(2);
  }

  /**
   * Получение имени сети по chainId
   * @private
   */
  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BSC',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
      8453: 'Base',
      100: 'Gnosis',
      250: 'Fantom',
      324: 'zkSync Era',
      1101: 'Polygon zkEVM',
      59144: 'Linea',
      534352: 'Scroll',
      5000: 'Mantle',
      1151111081099710: 'Solana',
    };

    return chainNames[chainId] || `Chain ${chainId}`;
  }

  /**
   * Определение типа сети по chainId
   * @private
   */
  private getChainType(chainId: number): 'EVM' | 'SVM' | 'OTHER' {
    if (chainId === 1151111081099710) return 'SVM'; // Solana
    return 'EVM';
  }

  /**
   * Маппинг статуса Socket на наш формат
   * @private
   */
  private mapStatus(
    status?: string
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    const statusMap: Record<string, any> = {
      PENDING: 'pending',
      READY: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
    };

    return statusMap[status || 'PENDING'] || 'pending';
  }

  /**
   * HTTP запрос к Socket API
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

    // Socket требует API key в заголовке
    // Документация: https://docs.socket.tech/socket-api/v2/guides/authentication
    if (this.apiKey) {
      headers['API-KEY'] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Socket API error: ${response.status} - ${error.message || error.error || 'Unknown error'}`
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
      return new Error('UNSUPPORTED_CHAIN: Chain not supported by Socket');
    }

    return new Error(`SOCKET_ERROR: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Типы ответов Socket API
 * Полная документация: https://docs.socket.tech/socket-api/v2
 */
interface SocketQuoteResponse {
  success: boolean;
  result?: {
    routes: Array<{
      routeId: string;
      fromChainId: number;
      toChainId: number;
      fromAsset: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        icon: string;
        chainId: number;
      };
      toAsset: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        icon: string;
        chainId: number;
      };
      fromAmount: string;
      toAmount: string;
      usedBridgeNames: string[];
      serviceTime: number;
      integratorFee?: {
        amount: string;
        amountInUsd: string;
      };
      userTxs: Array<{
        userTxType: string;
        chainId: number;
        protocol?: {
          displayName: string;
          icon: string;
        };
        fromAsset: any;
        toAsset: any;
        gasFees?: {
          amount: string;
          amountInUsd: string;
          asset: {
            symbol: string;
            decimals: number;
          };
        };
      }>;
    }>;
  };
}

interface SocketBuildTxResponse {
  success: boolean;
  result?: {
    txTarget: string;
    txData: string;
    value: string;
    chainId: number;
    gasLimit?: string;
    gasPrice?: string;
    approvalData?: any;
  };
}

interface SocketStatusResponse {
  success: boolean;
  result?: {
    status: string;
    statusMessage?: string;
    sourceTxHash: string;
    destinationTxHash?: string;
    currentStep?: number;
    totalSteps?: number;
  };
}
