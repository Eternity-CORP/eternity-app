import { Injectable } from '@nestjs/common';
import { ICrosschainRouter } from '../interfaces/CrosschainRouter.interface';
import {
  CrosschainQuoteParams,
  CrosschainQuote,
  CrosschainExecuteParams,
  CrosschainTransactionData,
  CrosschainTransactionStatus,
} from '../types/crosschain.types';

/**
 * Сервис для управления crosschain операциями
 * Поддерживает несколько роутеров (LI.FI, Socket, Squid, etc.)
 */
@Injectable()
export class CrosschainService {
  private routers: Map<string, ICrosschainRouter> = new Map();

  constructor() {
    // Routers can be registered later via registerRouter method
  }

  /**
   * Register a crosschain router
   */
  registerRouter(router: ICrosschainRouter): void {
    this.routers.set(router.name, router);
  }

  /**
   * Получение котировки для crosschain swap
   * Автоматически выбирает подходящий роутер
   */
  async getQuote(params: CrosschainQuoteParams): Promise<CrosschainQuote> {
    // Валидация параметров
    this.validateQuoteParams(params);

    // Выбор роутера
    const router = await this.selectRouter(params.fromChainId, params.toChainId);

    if (!router) {
      throw new Error(
        `No router available for ${params.fromChainId} -> ${params.toChainId}`
      );
    }

    try {
      return await router.getQuote(params);
    } catch (error) {
      throw this.handleRouterError(error, router.name);
    }
  }

  /**
   * Получение котировок от всех доступных роутеров
   * Полезно для сравнения цен
   */
  async getAllQuotes(
    params: CrosschainQuoteParams
  ): Promise<Array<{ router: string; quote: CrosschainQuote }>> {
    const results: Array<{ router: string; quote: CrosschainQuote }> = [];

    // Параллельный запрос ко всем роутерам
    const promises = Array.from(this.routers.values()).map(async (router) => {
      try {
        const supports = await router.supportsRoute(
          params.fromChainId,
          params.toChainId
        );

        if (!supports) {
          return null;
        }

        const quote = await router.getQuote(params);
        return { router: router.name, quote };
      } catch (error) {
        console.warn(`Router ${router.name} failed:`, error);
        return null;
      }
    });

    const settled = await Promise.all(promises);

    settled.forEach((result) => {
      if (result) {
        results.push(result);
      }
    });

    if (results.length === 0) {
      throw new Error('No quotes available from any router');
    }

    // Сортировка по estimatedOutput (по убыванию)
    results.sort((a, b) => {
      const aOutput = parseFloat(a.quote.estimatedOutput);
      const bOutput = parseFloat(b.quote.estimatedOutput);
      return bOutput - aOutput;
    });

    return results;
  }

  /**
   * Получение лучшей котировки (максимальный output)
   */
  async getBestQuote(
    params: CrosschainQuoteParams
  ): Promise<{ router: string; quote: CrosschainQuote }> {
    const quotes = await this.getAllQuotes(params);
    return quotes[0];
  }

  /**
   * Подготовка транзакции для подписи
   */
  async prepareTransaction(
    routerName: string,
    params: CrosschainExecuteParams
  ): Promise<CrosschainTransactionData> {
    const router = this.routers.get(routerName);

    if (!router) {
      throw new Error(`Router ${routerName} not found`);
    }

    try {
      return await router.prepareTransaction(params);
    } catch (error) {
      throw this.handleRouterError(error, routerName);
    }
  }

  /**
   * Получение статуса транзакции
   */
  async getTransactionStatus(
    routerName: string,
    txHash: string
  ): Promise<CrosschainTransactionStatus> {
    const router = this.routers.get(routerName);

    if (!router) {
      throw new Error(`Router ${routerName} not found`);
    }

    try {
      return await router.getTransactionStatus(txHash);
    } catch (error) {
      throw this.handleRouterError(error, routerName);
    }
  }

  /**
   * Получение списка доступных роутеров
   */
  getAvailableRouters(): string[] {
    return Array.from(this.routers.keys());
  }

  /**
   * Проверка поддержки маршрута
   */
  async supportsRoute(fromChainId: string, toChainId: string): Promise<boolean> {
    const router = await this.selectRouter(fromChainId, toChainId);
    return !!router;
  }

  /**
   * Выбор подходящего роутера для маршрута
   * Стратегия:
   * 1. Если обе сети EVM → предпочитаем LI.FI (лучшие цены, больше ликвидности)
   * 2. Если хотя бы одна сеть non-EVM (Solana) → используем Socket
   * 3. Fallback: поиск любого подходящего роутера
   * @private
   */
  private async selectRouter(
    fromChainId: string,
    toChainId: string
  ): Promise<ICrosschainRouter | null> {
    const fromChainType = this.getChainType(fromChainId);
    const toChainType = this.getChainType(toChainId);

    // Стратегия 1: Если обе сети EVM - предпочитаем LI.FI
    if (fromChainType === 'EVM' && toChainType === 'EVM') {
      const lifiRouter = this.routers.get('LI.FI');
      if (lifiRouter) {
        const supports = await lifiRouter.supportsRoute(fromChainId, toChainId);
        if (supports) {
          return lifiRouter;
        }
      }

      // Fallback на Socket если LI.FI не поддерживает
      const socketRouter = this.routers.get('Socket');
      if (socketRouter) {
        const supports = await socketRouter.supportsRoute(fromChainId, toChainId);
        if (supports) {
          return socketRouter;
        }
      }
    }

    // Стратегия 2: Если хотя бы одна сеть Solana - используем Socket
    if (fromChainType === 'SVM' || toChainType === 'SVM') {
      const socketRouter = this.routers.get('Socket');
      if (socketRouter) {
        const supports = await socketRouter.supportsRoute(fromChainId, toChainId);
        if (supports) {
          return socketRouter;
        }
      }
    }

    // Fallback: поиск любого подходящего роутера
    for (const router of this.routers.values()) {
      const supports = await router.supportsRoute(fromChainId, toChainId);
      if (supports) {
        return router;
      }
    }

    return null;
  }

  /**
   * Определение типа сети
   * @private
   */
  private getChainType(chainId: string): string {
    const evmChains = [
      'ethereum',
      'polygon',
      'bsc',
      'arbitrum',
      'optimism',
      'avalanche',
      'base',
      'gnosis',
    ];

    const svmChains = ['solana'];
    const tronChains = ['tron'];
    const btcChains = ['bitcoin'];
    const cosmosChains = ['cosmos', 'osmosis', 'thorchain', 'maya'];

    const chainLower = chainId.toLowerCase();

    if (evmChains.includes(chainLower)) return 'EVM';
    if (svmChains.includes(chainLower)) return 'SVM';
    if (tronChains.includes(chainLower)) return 'TRON';
    if (btcChains.includes(chainLower)) return 'BTC';
    if (cosmosChains.includes(chainLower)) return 'COSMOS';

    return 'OTHER';
  }

  /**
   * Валидация параметров котировки
   * @private
   */
  private validateQuoteParams(params: CrosschainQuoteParams): void {
    if (!params.fromChainId || !params.toChainId) {
      throw new Error('fromChainId and toChainId are required');
    }

    if (params.fromChainId === params.toChainId) {
      throw new Error('fromChainId and toChainId must be different');
    }

    // Проверка на testnet сети
    const testnets = ['sepolia', 'holesky', 'goerli', 'mumbai', 'fuji'];
    const fromIsTestnet = testnets.includes(params.fromChainId.toLowerCase());
    const toIsTestnet = testnets.includes(params.toChainId.toLowerCase());

    if (fromIsTestnet || toIsTestnet) {
      throw new Error(
        'Crosschain bridges do not support testnet networks. Please use mainnet networks (ethereum, polygon, arbitrum, optimism, base, etc.)'
      );
    }

    if (!params.fromTokenAddress || !params.toTokenAddress) {
      throw new Error('fromTokenAddress and toTokenAddress are required');
    }

    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('amount must be a positive number');
    }

    if (!params.fromAddress || !params.toAddress) {
      throw new Error('fromAddress and toAddress are required');
    }
  }

  /**
   * Обработка ошибок роутера
   * @private
   */
  private handleRouterError(error: any, routerName: string): Error {
    const message = error.message || 'Unknown error';

    if (message.includes('ROUTE_NOT_FOUND')) {
      return new Error(`No route found via ${routerName}`);
    }

    if (message.includes('UNSUPPORTED_CHAIN')) {
      return new Error(`Chain not supported by ${routerName}`);
    }

    return new Error(`${routerName} error: ${message}`);
  }
}
