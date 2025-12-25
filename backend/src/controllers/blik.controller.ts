import { Controller, Post, Get, Delete, Req, Res, Next, UseGuards, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtAuthGuard } from '../modules/shared/jwt-auth.guard';
import { BlikService } from '../services/Blik.service';
import {
  CreateBlikRequestDto,
  BlikRequestResponseDto,
  BlikRequestInfoDto,
  GetBlikQuoteRequestDto,
  BlikQuoteResponseDto,
  ExecuteBlikRequestDto,
  ExecuteBlikResponseDto,
  BlikErrorDto,
} from '../dto/blik.dto';

/**
 * Контроллер для BLIK-подобных платежных кодов
 */
@Controller('blik')
export class BlikController {
  private static readonly logger = new Logger(BlikController.name);

  constructor(private blikService: BlikService) {}

  /**
   * POST /api/blik/create
   * Создание платежного запроса с кодом
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      // Получение userId из auth middleware (JWT)
      const toUserId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!toUserId) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated',
        } as BlikErrorDto);
        return;
      }

      // Валидация body
      const requestDto: CreateBlikRequestDto = {
        amount: req.body.amount,
        tokenSymbol: req.body.tokenSymbol,
        preferredChainId: req.body.preferredChainId,
        ttlSeconds: req.body.ttlSeconds,
      };

      // Валидация обязательных полей
      if (!requestDto.amount || !requestDto.tokenSymbol) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'amount and tokenSymbol are required',
        } as BlikErrorDto);
        return;
      }

      // Создание запроса
      const result = await this.blikService.createRequest({
        toUserId,
        amount: requestDto.amount,
        tokenSymbol: requestDto.tokenSymbol,
        preferredChainId: requestDto.preferredChainId,
        ttlSeconds: requestDto.ttlSeconds,
      });

      const response: BlikRequestResponseDto = {
        code: result.code,
        expiresAt: result.expiresAt,
        amount: requestDto.amount,
        tokenSymbol: requestDto.tokenSymbol,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/blik/:code
   * Получение информации о платежном запросе
   */
  @Get(':code')
  async getRequestInfo(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;

      if (!code) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'code is required',
        } as BlikErrorDto);
        return;
      }

      const requestInfo = await this.blikService.getRequestByCode(code);

      if (!requestInfo) {
        res.status(404).json({
          code: 'REQUEST_NOT_FOUND',
          message: 'Payment request not found',
        } as BlikErrorDto);
        return;
      }

      const response: BlikRequestInfoDto = requestInfo;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/blik/:code/quote
   * Получение котировки для выполнения платежного запроса
   */
  @Post(':code/quote')
  @UseGuards(JwtAuthGuard)
  async getQuote(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;
      const fromUserId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!fromUserId) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated',
        } as BlikErrorDto);
        return;
      }

      // Валидация body
      const quoteDto: GetBlikQuoteRequestDto = {
        fromChainId: req.body.fromChainId,
        fromAddress: req.body.fromAddress,
      };

      if (!quoteDto.fromChainId || !quoteDto.fromAddress) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'fromChainId and fromAddress are required',
        } as BlikErrorDto);
        return;
      }

      // Получение котировки
      const quote = await this.blikService.getQuoteForRequest({
        code,
        fromUserId,
        fromChainId: quoteDto.fromChainId,
        fromAddress: quoteDto.fromAddress,
      });

      const response: BlikQuoteResponseDto = quote;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/blik/:code/execute
   * Выполнение платежного запроса
   */
  @Post(':code/execute')
  @UseGuards(JwtAuthGuard)
  async executeRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;
      const fromUserId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!fromUserId) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated',
        } as BlikErrorDto);
        return;
      }

      // Валидация body
      const executeDto: ExecuteBlikRequestDto = {
        fromChainId: req.body.fromChainId,
        fromAddress: req.body.fromAddress,
        routeId: req.body.routeId,
        txHash: req.body.txHash, // Mobile может передать txHash если транзакция уже отправлена
      };

      if (!executeDto.fromChainId || !executeDto.fromAddress) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'fromChainId and fromAddress are required',
        } as BlikErrorDto);
        return;
      }

      // Выполнение запроса
      const result = await this.blikService.executeRequest({
        code,
        fromUserId,
        fromChainId: executeDto.fromChainId,
        fromAddress: executeDto.fromAddress,
        routeId: executeDto.routeId,
        txHash: executeDto.txHash,
      });

      const response: ExecuteBlikResponseDto = {
        txHash: result.txHash,
        status: result.status,
        code,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/blik/:code
   * Отмена платежного запроса
   */
  @Delete(':code')
  @UseGuards(JwtAuthGuard)
  async cancelRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      const { code } = req.params;
      const userId = (req.user as any)?.id || (req.user as any)?.userId;

      if (!userId) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated',
        } as BlikErrorDto);
        return;
      }

      await this.blikService.cancelRequest(code, userId);

      res.status(200).json({
        message: 'Payment request cancelled',
        code,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Error handler для BLIK операций
   */
  static errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    BlikController.logger.error('BLIK error:', error.stack);

    // Обработка специфичных ошибок
    if (error.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({
        code: 'REQUEST_NOT_FOUND',
        message: 'Payment request not found',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('REQUEST_NOT_AVAILABLE')) {
      res.status(400).json({
        code: 'REQUEST_NOT_AVAILABLE',
        message: error.message,
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('REQUEST_ALREADY_CLAIMED')) {
      res.status(409).json({
        code: 'REQUEST_ALREADY_CLAIMED',
        message: 'Another user is processing this request',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('REQUEST_EXPIRED')) {
      res.status(410).json({
        code: 'REQUEST_EXPIRED',
        message: 'Payment request has expired',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('MAX_ACTIVE_CODES_EXCEEDED')) {
      res.status(429).json({
        code: 'MAX_ACTIVE_CODES_EXCEEDED',
        message: error.message,
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('CANNOT_PAY_YOURSELF')) {
      res.status(400).json({
        code: 'CANNOT_PAY_YOURSELF',
        message: 'Cannot pay to yourself',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('RECIPIENT_NOT_FOUND')) {
      res.status(404).json({
        code: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient not found',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('INVALID_AMOUNT')) {
      res.status(400).json({
        code: 'INVALID_AMOUNT',
        message: 'Invalid amount',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('FORBIDDEN')) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: error.message,
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('TX_HASH_REQUIRED')) {
      res.status(400).json({
        code: 'TX_HASH_REQUIRED',
        message: 'Mobile must send the transaction and provide txHash. Backend does not have private keys.',
      } as BlikErrorDto);
      return;
    }

    if (error.message.includes('CROSSCHAIN_ROUTE_UNAVAILABLE')) {
      res.status(400).json({
        code: 'CROSSCHAIN_ROUTE_UNAVAILABLE',
        message: error.message,
      } as BlikErrorDto);
      return;
    }

    // Общая ошибка
    res.status(500).json({
      code: 'BLIK_ERROR',
      message: error.message || 'An error occurred during BLIK operation',
    } as BlikErrorDto);
  }
}

/**
 * Фабрика для создания Express router
 */
export function createBlikRouter(blikService: BlikService) {
  const express = require('express');
  const router = express.Router();
  const controller = new BlikController(blikService);

  // Импорт rate limiters
  const {
    blikRateLimiter,
    blikCreateRateLimiter,
  } = require('../middleware/rateLimiter');

  // Применяем rate limiting
  router.post('/create', blikCreateRateLimiter, controller.createRequest.bind(controller));
  router.get('/:code', blikRateLimiter, controller.getRequestInfo.bind(controller));
  router.post('/:code/quote', blikRateLimiter, controller.getQuote.bind(controller));
  router.post('/:code/execute', blikRateLimiter, controller.executeRequest.bind(controller));
  router.delete('/:code', controller.cancelRequest.bind(controller));

  router.use(BlikController.errorHandler);

  return router;
}
