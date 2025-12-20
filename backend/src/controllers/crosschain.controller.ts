import { Request, Response, NextFunction } from 'express';
import { CrosschainService } from '../services/Crosschain.service';

/**
 * Контроллер для crosschain операций
 */
export class CrosschainController {
  constructor(private crosschainService: CrosschainService) {}

  /**
   * GET /api/v1/crosschain/quote
   * Получение котировки для crosschain swap
   */
  async getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        fromChainId: req.query.fromChainId as string,
        toChainId: req.query.toChainId as string,
        fromTokenAddress: req.query.fromToken as string,
        toTokenAddress: req.query.toToken as string,
        amount: req.query.amount as string,
        fromAddress: req.query.fromAddress as string,
        toAddress: req.query.toAddress as string,
        slippage: req.query.slippage ? parseFloat(req.query.slippage as string) : undefined,
      };

      const result = await this.crosschainService.getBestQuote(params);

      res.status(200).json({
        estimatedOutput: result.quote.estimatedOutput,
        fee: result.quote.fee,
        feeToken: result.quote.feeToken,
        durationSeconds: result.quote.durationSeconds,
        priceImpact: result.quote.priceImpact,
        route: result.quote.route,
        router: result.router,
        provider: result.router.toLowerCase() as 'lifi' | 'rango',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crosschain/quotes/compare
   * Сравнение котировок от всех роутеров
   */
  async compareQuotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        fromChainId: req.query.fromChainId as string,
        toChainId: req.query.toChainId as string,
        fromTokenAddress: req.query.fromToken as string,
        toTokenAddress: req.query.toToken as string,
        amount: req.query.amount as string,
        fromAddress: req.query.fromAddress as string,
        toAddress: req.query.toAddress as string,
      };

      const quotes = await this.crosschainService.getAllQuotes(params);

      res.status(200).json({
        quotes: quotes.map((q) => ({
          router: q.router,
          estimatedOutput: q.quote.estimatedOutput,
          fee: q.quote.fee,
          durationSeconds: q.quote.durationSeconds,
        })),
        bestRouter: quotes[0].router,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/crosschain/prepare
   * Подготовка транзакции для подписи
   */
  async prepareTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { router, routeId, fromAddress, toAddress } = req.body;

      const txData = await this.crosschainService.prepareTransaction(router, {
        routeId,
        fromAddress,
        toAddress,
      });

      res.status(200).json(txData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crosschain/status/:txHash
   * Получение статуса crosschain транзакции
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { txHash } = req.params;
      const router = req.query.router as string;

      if (!router) {
        res.status(400).json({ error: 'Router parameter is required' });
        return;
      }

      const status = await this.crosschainService.getTransactionStatus(router, txHash);

      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/crosschain/routers
   * Получение списка доступных роутеров
   */
  async getRouters(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routers = this.crosschainService.getAvailableRouters();
      res.status(200).json({ routers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Error handler для crosschain операций
   */
  static errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction): void {
    console.error('Crosschain error:', error);

    if (error.message.includes('No route found')) {
      res.status(404).json({
        code: 'ROUTE_NOT_FOUND',
        message: 'No crosschain route available for this pair',
      });
      return;
    }

    if (error.message.includes('not supported')) {
      res.status(400).json({
        code: 'UNSUPPORTED_CHAIN',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'CROSSCHAIN_ERROR',
      message: error.message || 'An error occurred during crosschain operation',
    });
  }
}

/**
 * Фабрика для создания Express router
 */
export function createCrosschainRouter(crosschainService: CrosschainService) {
  const express = require('express');
  const router = express.Router();
  const controller = new CrosschainController(crosschainService);

  router.get('/quote', controller.getQuote.bind(controller));
  router.get('/quotes/compare', controller.compareQuotes.bind(controller));
  router.post('/prepare', controller.prepareTransaction.bind(controller));
  router.get('/status/:txHash', controller.getStatus.bind(controller));
  router.get('/routers', controller.getRouters.bind(controller));

  router.use(CrosschainController.errorHandler);

  return router;
}
