import { Request, Response, NextFunction } from 'express';
import { PaymentService, PaymentError } from '../services/Payment.service';
import {
  SendByIdentifierRequestDto,
  SendByIdentifierResponseDto,
  PaymentErrorDto,
} from '../dto/payments.dto';

/**
 * Контроллер для обработки платежных операций
 */
export class PaymentsController {
  constructor(private paymentService: PaymentService) {}

  /**
   * POST /api/v1/payments/send-by-identifier
   * Отправка средств по идентификатору получателя
   */
  async sendByIdentifier(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Получение userId из auth middleware (JWT)
      const fromUserId = req.user?.id;

      if (!fromUserId) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'User is not authenticated',
        } as PaymentErrorDto);
        return;
      }

      // Валидация body
      const requestDto: SendByIdentifierRequestDto = {
        identifier: req.body.identifier,
        chainId: req.body.chainId,
        token: req.body.token,
        amount: req.body.amount?.toString(),
        memo: req.body.memo,
      };

      // Выполнение платежа
      const result: SendByIdentifierResponseDto =
        await this.paymentService.sendByIdentifier(fromUserId, requestDto);

      // Успешный ответ
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Middleware для обработки ошибок платежей
   */
  static errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    if (error instanceof PaymentError) {
      // Определение HTTP статуса по коду ошибки
      const statusCode = PaymentsController.getStatusCodeForError(error.code);

      res.status(statusCode).json({
        code: error.code,
        message: error.message,
        details: error.details,
      } as PaymentErrorDto);
      return;
    }

    // Неизвестная ошибка
    console.error('Unexpected error in payments controller:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    } as PaymentErrorDto);
  }

  /**
   * Маппинг кодов ошибок на HTTP статусы
   * @private
   */
  private static getStatusCodeForError(errorCode: string): number {
    const statusMap: Record<string, number> = {
      RECIPIENT_NOT_FOUND: 404,
      CANNOT_SEND_TO_SELF: 400,
      RECIPIENT_NO_ADDRESS_FOR_CHAIN: 400,
      INSUFFICIENT_BALANCE: 400,
      INVALID_IDENTIFIER: 400,
      INVALID_CHAIN_ID: 400,
      INVALID_TOKEN: 400,
      INVALID_AMOUNT: 400,
      BLOCKCHAIN_ERROR: 503,
    };

    return statusMap[errorCode] || 500;
  }
}

/**
 * Фабрика для создания Express router с настроенными маршрутами
 */
export function createPaymentsRouter(paymentService: PaymentService) {
  const express = require('express');
  const router = express.Router();
  const controller = new PaymentsController(paymentService);

  // POST /api/v1/payments/send-by-identifier
  router.post(
    '/send-by-identifier',
    controller.sendByIdentifier.bind(controller)
  );

  // Error handler
  router.use(PaymentsController.errorHandler);

  return router;
}
