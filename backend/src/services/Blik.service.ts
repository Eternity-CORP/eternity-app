import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentRequest } from '../entities/PaymentRequest.entity';
import { User } from '../../database/entities/user.entity';
import { IdentityResolverService } from './IdentityResolver.service';
import { CrosschainService } from './Crosschain.service';
import { PaymentService } from './Payment.service';
import {
  CreatePaymentRequestParams,
  PaymentRequestInfo,
  GetQuoteForRequestParams,
  ExecutePaymentRequestParams,
  PaymentRequestQuote,
  PaymentRequestStatus,
} from '../types/blik.types';

/**
 * BLIK-подобный сервис для платежей по кодам
 * Позволяет создавать временные коды для получения платежей
 */
@Injectable()
export class BlikService {
  private readonly DEFAULT_TTL_SECONDS = 300; // 5 минут
  private readonly CODE_LENGTH = 6;
  private readonly CODE_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly MAX_ACTIVE_CODES_PER_USER = 10; // Максимум активных кодов на пользователя

  constructor(
    @InjectRepository(PaymentRequest)
    private paymentRequestRepository: Repository<PaymentRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private identityResolver: IdentityResolverService,
    private crosschainService: CrosschainService,
    private paymentService: PaymentService
  ) {}

  /**
   * Создание платежного запроса с уникальным кодом
   */
  async createRequest(
    params: CreatePaymentRequestParams
  ): Promise<{ code: string; expiresAt: Date }> {
    // Валидация получателя
    const toUser = await this.userRepository.findOne({
      where: { id: params.toUserId },
    });

    if (!toUser) {
      throw new Error('RECIPIENT_NOT_FOUND: User not found');
    }

    // Проверка лимита активных кодов
    const activeCodesCount = await this.paymentRequestRepository.count({
      where: {
        toUserId: params.toUserId,
        status: PaymentRequestStatus.PENDING,
      },
    });

    if (activeCodesCount >= this.MAX_ACTIVE_CODES_PER_USER) {
      throw new Error(
        `MAX_ACTIVE_CODES_EXCEEDED: You have ${activeCodesCount} active payment codes. Maximum is ${this.MAX_ACTIVE_CODES_PER_USER}. Please cancel or wait for expiration of old codes.`
      );
    }

    // Валидация суммы
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT: Amount must be positive');
    }

    // Генерация уникального кода
    const code = await this.generateUniqueCode();

    // Расчёт времени истечения
    const ttl = params.ttlSeconds || this.DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Создание записи
    const paymentRequest = this.paymentRequestRepository.create({
      code,
      toUserId: params.toUserId,
      amount: params.amount,
      tokenSymbol: params.tokenSymbol.toUpperCase(),
      preferredChainId: params.preferredChainId as any, // Cast для совместимости с ChainId enum
      status: PaymentRequestStatus.PENDING,
      expiresAt,
    });

    await this.paymentRequestRepository.save(paymentRequest);

    return { code, expiresAt };
  }

  /**
   * Получение информации о платежном запросе по коду
   */
  async getRequestByCode(code: string): Promise<PaymentRequestInfo | null> {
    const request = await this.paymentRequestRepository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['toUser'],
    });

    if (!request) {
      return null;
    }

    // Проверка истечения срока
    await this.checkAndUpdateExpiredStatus(request);

    // Build nested toUser object with wallet info
    const preferredChainId = request.preferredChainId || 'sepolia';
    const wallets = request.toUser?.walletAddress ? [{
      chainId: preferredChainId,
      address: request.toUser.walletAddress,
      isPrimary: true,
    }] : [];

    return {
      code: request.code,
      toUser: {
        id: request.toUserId,
        globalId: request.toUser ? `EY-${request.toUser.id.slice(0, 8).toUpperCase()}` : '',
        nickname: request.toUser?.nickname || '',
        wallets,
      },
      amount: request.amount,
      tokenSymbol: request.tokenSymbol,
      preferredChainId: request.preferredChainId || undefined,
      status: request.status as PaymentRequestStatus,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
    };
  }

  /**
   * Получение котировки для выполнения платежного запроса
   */
  async getQuoteForRequest(
    params: GetQuoteForRequestParams
  ): Promise<PaymentRequestQuote> {
    // Получение запроса
    const request = await this.paymentRequestRepository.findOne({
      where: { code: params.code.toUpperCase() },
      relations: ['toUser'],
    });

    if (!request) {
      throw new Error('REQUEST_NOT_FOUND: Payment request not found');
    }

    // Проверка статуса
    await this.checkAndUpdateExpiredStatus(request);

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new Error(
        `REQUEST_NOT_AVAILABLE: Request status is ${request.status}`
      );
    }

    // Проверка, что отправитель != получатель
    if (params.fromUserId === request.toUserId) {
      throw new Error('CANNOT_PAY_YOURSELF: Cannot pay to yourself');
    }

    // Резолвинг получателя через IdentityResolver
    const recipientResolved = await this.identityResolver.resolveIdentifier(
      `EY-${request.toUser.id.slice(0, 8).toUpperCase()}`
    );

    if (!recipientResolved) {
      throw new Error('RECIPIENT_NOT_RESOLVED: Cannot resolve recipient');
    }

    // Определение целевой сети (toChainId) и адреса
    let toChainId: string | null = request.preferredChainId as string | null;
    let toAddress: string | null = null;

    if (!toChainId) {
      // Если не указана preferred_chain, берём из token_preferences
      toChainId = this.identityResolver.getPreferredChainForToken(
        recipientResolved,
        request.tokenSymbol
      );
    }

    if (toChainId) {
      // Если нашли целевую сеть, получаем адрес для этой сети
      toAddress = this.identityResolver.getAddressForChain(recipientResolved, toChainId);
    }

    if (!toChainId || !toAddress) {
      // Fallback: используем оптимальный адрес (primary wallet или первый доступный)
      const optimalAddress = this.identityResolver.getOptimalAddressForToken(
        recipientResolved,
        request.tokenSymbol
      );

      if (!optimalAddress) {
        throw new Error(
          'NO_TARGET_CHAIN: Recipient has no wallet addresses configured'
        );
      }

      toChainId = optimalAddress.chainId;
      toAddress = optimalAddress.address;
    }

    // Проверка: same-chain или crosschain
    const isSameChain = params.fromChainId === toChainId;

    let quote;

    if (isSameChain) {
      // Same-chain перевод через PaymentService
      // TODO: получить оценку комиссии для same-chain
      quote = {
        estimatedOutput: request.amount,
        fee: '0', // TODO: рассчитать реальную комиссию
        feeToken: request.tokenSymbol,
        durationSeconds: 30,
        provider: 'same-chain' as const,
      };
    } else {
      // Crosschain перевод через CrosschainService
      const crosschainQuote = await this.crosschainService.getBestQuote({
        fromChainId: params.fromChainId,
        toChainId,
        fromTokenAddress: await this.getTokenAddress(
          params.fromChainId,
          request.tokenSymbol
        ),
        toTokenAddress: await this.getTokenAddress(toChainId, request.tokenSymbol),
        amount: request.amount,
        fromAddress: params.fromAddress,
        toAddress,
      });

      quote = {
        estimatedOutput: crosschainQuote.quote.estimatedOutput,
        fee: crosschainQuote.quote.fee,
        feeToken: crosschainQuote.quote.feeToken,
        durationSeconds: crosschainQuote.quote.durationSeconds,
        provider: crosschainQuote.router.toLowerCase() as 'lifi' | 'rango',
        routeId: crosschainQuote.quote.route.id,
      };
    }

    // Build nested toUser object with wallet info
    const wallets = request.toUser?.walletAddress ? [{
      chainId: toChainId,
      address: request.toUser.walletAddress,
      isPrimary: true,
    }] : [];

    return {
      requestInfo: {
        code: request.code,
        toUser: {
          id: request.toUserId,
          globalId: request.toUser ? `EY-${request.toUser.id.slice(0, 8).toUpperCase()}` : '',
          nickname: request.toUser?.nickname || '',
          wallets,
        },
        amount: request.amount,
        tokenSymbol: request.tokenSymbol,
        preferredChainId: toChainId || undefined,
        status: request.status as PaymentRequestStatus,
        expiresAt: request.expiresAt,
        createdAt: request.createdAt,
      },
      quote,
    };
  }

  /**
   * Выполнение платежного запроса
   * Использует пессимистичную блокировку для предотвращения race condition
   */
  async executeRequest(
    params: ExecutePaymentRequestParams
  ): Promise<{ txHash: string; status: string }> {
    // Используем транзакцию с блокировкой для предотвращения race condition
    return await this.paymentRequestRepository.manager.transaction(
      async (manager) => {
        // SELECT FOR UPDATE блокирует строку до конца транзакции
        // Не используем JOIN с toUser, так как FOR UPDATE не работает с LEFT JOIN
        const request = await manager
          .createQueryBuilder(PaymentRequest, 'pr')
          .setLock('pessimistic_write')
          .where('pr.code = :code', { code: params.code.toUpperCase() })
          .getOne();

        if (!request) {
          throw new Error('REQUEST_NOT_FOUND: Payment request not found');
        }

        // Загружаем toUser отдельно
        const toUser = await manager.findOne(User, {
          where: { id: request.toUserId },
        });

        if (!toUser) {
          throw new Error('RECIPIENT_NOT_FOUND: Recipient user not found');
        }

        request.toUser = toUser;

        // Проверка статуса
        if (request.status !== PaymentRequestStatus.PENDING) {
          throw new Error(
            `REQUEST_NOT_AVAILABLE: Request status is ${request.status}`
          );
        }

        // Проверка TTL
        if (new Date() > request.expiresAt) {
          request.status = PaymentRequestStatus.EXPIRED;
          await manager.save(request);
          throw new Error('REQUEST_EXPIRED: Payment request has expired');
        }

        // Проверка idempotency: если fromUserId уже установлен
        if (request.fromUserId) {
          if (request.fromUserId !== params.fromUserId) {
            throw new Error(
              'REQUEST_ALREADY_CLAIMED: Another user is processing this request'
            );
          }
          // Если тот же пользователь - idempotent retry
          if (request.txHash) {
            return {
              txHash: request.txHash,
              status: request.status,
            };
          }
        }

        // Проверка, что отправитель != получатель
        if (params.fromUserId === request.toUserId) {
          throw new Error('CANNOT_PAY_YOURSELF: Cannot pay to yourself');
        }

        // Установка fromUserId (атомарно в транзакции)
        request.fromUserId = params.fromUserId;
        await manager.save(request);

    try {
      // Резолвинг получателя
      const recipientResolved = await this.identityResolver.resolveIdentifier(
        `EY-${request.toUser.id.slice(0, 8).toUpperCase()}`
      );

      if (!recipientResolved) {
        throw new Error('RECIPIENT_NOT_RESOLVED');
      }

      // Определение целевой сети и адреса
      let toChainId: string | null = request.preferredChainId;
      let toAddress: string | null = null;

      if (!toChainId) {
        toChainId = this.identityResolver.getPreferredChainForToken(
          recipientResolved,
          request.tokenSymbol
        );
      }

      if (toChainId) {
        // Если нашли целевую сеть, получаем адрес для этой сети
        toAddress = this.identityResolver.getAddressForChain(recipientResolved, toChainId);
      }

      if (!toChainId || !toAddress) {
        // Fallback: используем оптимальный адрес (primary wallet или первый доступный)
        const optimalAddress = this.identityResolver.getOptimalAddressForToken(
          recipientResolved,
          request.tokenSymbol
        );

        if (!optimalAddress) {
          throw new Error('NO_TARGET_CHAIN');
        }

        toChainId = optimalAddress.chainId;
        toAddress = optimalAddress.address;
      }

      let txHash: string;

      // Выполнение перевода
      if (params.fromChainId === toChainId) {
        // Same-chain через PaymentService
        const result = await this.paymentService.sendByIdentifier(
          params.fromUserId,
          {
            identifier: `EY-${request.toUser.id.slice(0, 8).toUpperCase()}`,
            chainId: params.fromChainId,
            token: request.tokenSymbol,
            amount: request.amount,
            memo: `BLIK payment: ${request.code}`,
          }
        );

        txHash = result.txHash;
      } else {
        // Crosschain через CrosschainService
        // TODO: Реализовать выполнение crosschain транзакции
        // Сейчас CrosschainService возвращает только котировки
        // Нужно добавить метод executeTransaction в CrosschainService
        
        // Временное решение: используем prepareTransaction для получения данных
        await this.crosschainService.prepareTransaction(
          params.routeId ? 'Rango' : 'LI.FI', // Определяем роутер по routeId
          {
            routeId: params.routeId || '',
            fromAddress: params.fromAddress,
            toAddress,
          }
        );

        // TODO: Здесь должна быть логика подписи и отправки транзакции
        // Пока возвращаем mock txHash
        txHash = `0x${Date.now().toString(16)}`;
      }

        // Обновление статуса (атомарно в транзакции)
        request.status = PaymentRequestStatus.COMPLETED;
        request.txHash = txHash;
        request.executedAt = new Date();
        request.actualChainId = params.fromChainId as any;
        await manager.save(request);

        return {
          txHash,
          status: 'completed',
        };
      } catch (error) {
        // В случае ошибки fromUserId остаётся, но статус pending
        // Пользователь может повторить попытку
        throw error;
      }
    }
  );
}

  /**
   * Отмена платежного запроса
   */
  async cancelRequest(code: string, userId: string): Promise<void> {
    const request = await this.paymentRequestRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!request) {
      throw new Error('REQUEST_NOT_FOUND: Payment request not found');
    }

    // Только создатель может отменить
    if (request.toUserId !== userId) {
      throw new Error('FORBIDDEN: Only creator can cancel request');
    }

    if (request.status !== PaymentRequestStatus.PENDING) {
      throw new Error('REQUEST_NOT_CANCELLABLE: Request is not pending');
    }

    request.status = PaymentRequestStatus.CANCELLED;
    await this.paymentRequestRepository.save(request);
  }

  /**
   * Генерация уникального кода
   * @private
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateRandomCode();
      const existing = await this.paymentRequestRepository.findOne({
        where: { code },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('CODE_GENERATION_FAILED: Cannot generate unique code');
  }

  /**
   * Генерация случайного кода
   * @private
   */
  private generateRandomCode(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.CODE_CHARSET.length);
      code += this.CODE_CHARSET[randomIndex];
    }
    return code;
  }

  /**
   * Проверка и обновление статуса истёкших запросов
   * @private
   */
  private async checkAndUpdateExpiredStatus(
    request: PaymentRequest
  ): Promise<void> {
    if (
      request.status === PaymentRequestStatus.PENDING &&
      new Date() > request.expiresAt
    ) {
      request.status = PaymentRequestStatus.EXPIRED;
      await this.paymentRequestRepository.save(request);
    }
  }

  /**
   * Получение адреса токена для сети
   * TODO: Реализовать через TokenRegistry или конфиг
   * @private
   */
  private async getTokenAddress(
    chainId: string,
    tokenSymbol: string
  ): Promise<string> {
    // Временная заглушка
    // В production должен быть TokenRegistry с маппингом symbol -> address по сетям
    const tokenMap: Record<string, Record<string, string>> = {
      ethereum: {
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        ETH: '0x0000000000000000000000000000000000000000',
      },
      polygon: {
        USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        MATIC: '0x0000000000000000000000000000000000000000',
      },
    };

    return (
      tokenMap[chainId]?.[tokenSymbol] ||
      '0x0000000000000000000000000000000000000000'
    );
  }

  /**
   * Крон-задача для очистки истёкших запросов
   * Должна вызываться периодически (например, каждую минуту)
   */
  async expireOldRequests(): Promise<number> {
    const result = await this.paymentRequestRepository
      .createQueryBuilder()
      .update(PaymentRequest)
      .set({ status: PaymentRequestStatus.EXPIRED })
      .where('status = :status', { status: PaymentRequestStatus.PENDING })
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
